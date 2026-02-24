import React from 'react';
import './Stars.css';

export const Stars: React.FC = () => {
    return (
        <div className="stars-container">
            <div className="stars stars-1"></div>
            <div className="stars stars-2"></div>
            <div className="stars stars-3"></div>
            <div className="twinkling-fog"></div>
        </div>
    );
};
