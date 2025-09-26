
import React, { ReactNode } from 'react';
import Icon from './Icon';

const AccountDataCard = React.memo(({ iconPath, title, children }: { iconPath: React.ReactNode; title: string; children?: ReactNode }) => (
    <div className="card account-card">
        <div className="card-icon-wrapper">
            {/* FIX: Explicitly pass children to Icon component */}
            <Icon children={iconPath} />
        </div>
        <div className="card-details">
            <div className="card-title">{title}</div>
            <div className="card-content">{children}</div>
        </div>
    </div>
));

export default AccountDataCard;