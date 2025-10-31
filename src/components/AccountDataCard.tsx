

import React, { ReactNode } from 'react';
import Icon from './Icon';

const AccountDataCard = React.memo(({ iconPath, title, children }: { iconPath: React.ReactNode; title: string; children?: ReactNode }) => (
    <div className="card account-card">
        <div className="card-icon-wrapper">
            {/* FIX: The Icon component requires a child. The iconPath prop is passed as a child. */}
            <Icon>{iconPath}</Icon>
        </div>
        <div className="card-details">
            <div className="card-title">{title}</div>
            <div className="card-content">{children}</div>
        </div>
    </div>
));

export default AccountDataCard;