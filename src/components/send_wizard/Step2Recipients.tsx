import React, { useEffect, useState, useMemo } from 'react';
import WizardLayout from './WizardLayout';
import MultiSelectSearch from '../MultiSelectSearch';
import useApiV4 from '../../hooks/useApiV4';
import { List, Segment } from '../../api/types';
import { apiFetch } from '../../api/elasticEmail';
import { useToast } from '../../contexts/ToastContext';
import Loader from '../Loader';

const Step2Recipients = ({ onNext, onBack, data, updateData, apiKey }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; }) => {
    const { addToast } = useToast();
    const [segmentDisplayCounts, setSegmentDisplayCounts] = useState<Record<string, number | null>>({});

    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, { limit: 1000 });
    const { data: segmentsData, loading: segmentsLoading } = useApiV4('/segments', apiKey, {});

    const segments = useMemo(() => segmentsData || [], [segmentsData]);

    // Effect to fetch counts for dropdown display
    useEffect(() => {
        if (segments.length > 0 && apiKey) {
            segments.forEach((seg: Segment) => {
                if (segmentDisplayCounts[seg.Name] === undefined) { // Check if not already fetching or fetched
                    setSegmentDisplayCounts(prev => ({...prev, [seg.Name]: null})); // Mark as loading
                    apiFetch('/contact/count', apiKey, { params: { rule: seg.Rule } }).then(count => {
                        setSegmentDisplayCounts(prev => ({...prev, [seg.Name]: Number(count)}));
                    }).catch(() => {
                        setSegmentDisplayCounts(prev => ({...prev, [seg.Name]: null})); // error
                    });
                }
            });
        }
    }, [segments, apiKey]); // Note: segmentDisplayCounts is intentionally omitted to prevent loops

    const listItems = (lists || []).map((l: List) => ({ id: l.ListName, name: l.ListName }));
    
    const segmentItems = useMemo(() => {
        return segments.map((s: Segment) => {
            const count = segmentDisplayCounts[s.Name];
            const nameWithCount = count !== null && count !== undefined
                ? `${s.Name} (${count.toLocaleString()})`
                : `${s.Name} (...)`;
            return { id: s.Name, name: nameWithCount };
        });
    }, [segments, segmentDisplayCounts]);

    useEffect(() => {
        const calculateCount = async () => {
            if (!apiKey) return;
            
            updateData({ isCountLoading: true });
    
            try {
                let countResult: number | null = 0;
                const { recipientTarget, recipients } = data;
    
                if (recipientTarget === 'all') {
                    const count = await apiFetch('/contact/count', apiKey, { params: { allContacts: 'true' } });
                    countResult = Number(count);
                } else if (recipientTarget === 'list' && recipients.listNames.length > 0) {
                    const counts = await Promise.all(
                        recipients.listNames.map((listName: string) =>
                            apiFetch('/contact/count', apiKey, { params: { rule: `listname = '${listName.replace(/'/g, "''")}'` } })
                        )
                    );
                    countResult = counts.reduce((sum, count) => sum + Number(count), 0);
                } else if (recipientTarget === 'segment' && recipients.segmentNames.length > 0) {
                    const selectedSegmentsWithRules = recipients.segmentNames
                        .map((name: string) => segments.find((s: Segment) => s.Name === name))
                        .filter((s?: Segment): s is Segment => !!s);

                    if (selectedSegmentsWithRules.length > 0) {
                        const counts = await Promise.all(
                            selectedSegmentsWithRules.map(segment =>
                                apiFetch('/contact/count', apiKey, { params: { rule: segment.Rule } })
                            )
                        );
                        countResult = counts.reduce((sum, count) => sum + Number(count), 0);
                    }
                } else {
                    countResult = 0;
                }
                updateData({ recipientCount: countResult, isCountLoading: false });
            } catch (error) {
                console.error("Failed to calculate recipient count:", error);
                addToast(`Failed to get recipient count: ${(error as Error).message}`, 'error');
                updateData({ recipientCount: null, isCountLoading: false });
            }
        };
    
        const debounceTimer = setTimeout(() => {
            calculateCount();
        }, 300);
    
        return () => clearTimeout(debounceTimer);
    }, [data.recipientTarget, data.recipients.listNames, data.recipients.segmentNames, apiKey, segments, updateData, addToast]);


    const handleTargetChange = (target: 'all' | 'list' | 'segment') => {
        updateData({ recipientTarget: target, recipients: { listNames: [], segmentNames: [] } });
    };

    const handleSelectionChange = (selected: string[], type: 'listNames' | 'segmentNames') => {
        updateData({ recipients: { ...data.recipients, [type]: selected } });
    };
    
    const isNextDisabled = !data.recipientTarget || 
        (data.recipientTarget === 'list' && data.recipients.listNames.length === 0) ||
        (data.recipientTarget === 'segment' && data.recipients.segmentNames.length === 0);

    return (
        <WizardLayout
            step={2}
            title="Recipients"
            onNext={onNext}
            onBack={onBack}
            nextDisabled={isNextDisabled}
        >
            <div className="recipient-options">
                <label className="custom-radio">
                    <input type="radio" name="recipientTarget" checked={data.recipientTarget === 'all'} onChange={() => handleTargetChange('all')} />
                    <span className="radio-checkmark"></span>
                    <span className="radio-label">All Contacts</span>
                </label>
                <label className="custom-radio">
                    <input type="radio" name="recipientTarget" checked={data.recipientTarget === 'list'} onChange={() => handleTargetChange('list')} />
                    <span className="radio-checkmark"></span>
                    <span className="radio-label">Lists</span>
                </label>
                <label className="custom-radio">
                    <input type="radio" name="recipientTarget" checked={data.recipientTarget === 'segment'} onChange={() => handleTargetChange('segment')} />
                    <span className="radio-checkmark"></span>
                    <span className="radio-label">Segments</span>
                </label>
            </div>

            {data.recipientTarget === 'list' && (
                <MultiSelectSearch
                    items={listItems}
                    selectedItems={data.recipients.listNames}
                    onSelectionChange={(selected) => handleSelectionChange(selected, 'listNames')}
                    placeholder="# Select your contacts.."
                    loading={listsLoading}
                />
            )}
             {data.recipientTarget === 'segment' && (
                <MultiSelectSearch
                    items={segmentItems}
                    selectedItems={data.recipients.segmentNames}
                    onSelectionChange={(selected) => handleSelectionChange(selected, 'segmentNames')}
                    placeholder="# Select your contacts.."
                    loading={segmentsLoading}
                />
            )}
            
            <div className="recipient-count-display">
                <strong>
                    {data.isCountLoading ? <Loader /> : (data.recipientCount !== null ? data.recipientCount.toLocaleString() : '0')}
                </strong>
                <span>Selected Audiences</span>
            </div>
        </WizardLayout>
    );
};

export default Step2Recipients;