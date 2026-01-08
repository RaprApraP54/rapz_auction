import { useState, useEffect } from 'react';
import './CountdownTimer.css';

const CountdownTimer = ({ endTime, onEnd }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isEnded, setIsEnded] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = Math.floor(Date.now() / 1000);
            const difference = endTime - now;

            if (difference <= 0) {
                setIsEnded(true);
                if (onEnd) onEnd();
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            return {
                days: Math.floor(difference / (60 * 60 * 24)),
                hours: Math.floor((difference % (60 * 60 * 24)) / (60 * 60)),
                minutes: Math.floor((difference % (60 * 60)) / 60),
                seconds: difference % 60
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime, onEnd]);

    const formatNumber = (num) => String(num).padStart(2, '0');

    if (isEnded) {
        return (
            <div className="countdown-timer ended">
                <span className="countdown-label">Lelang Berakhir</span>
            </div>
        );
    }

    return (
        <div className="countdown-timer">
            <span className="countdown-label">Sisa Waktu</span>
            <div className="countdown-display">
                {timeLeft.days > 0 && (
                    <div className="countdown-unit">
                        <span className="countdown-value">{formatNumber(timeLeft.days)}</span>
                        <span className="countdown-unit-label">Hari</span>
                    </div>
                )}
                <div className="countdown-unit">
                    <span className="countdown-value">{formatNumber(timeLeft.hours)}</span>
                    <span className="countdown-unit-label">Jam</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-unit">
                    <span className="countdown-value">{formatNumber(timeLeft.minutes)}</span>
                    <span className="countdown-unit-label">Menit</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-unit">
                    <span className="countdown-value">{formatNumber(timeLeft.seconds)}</span>
                    <span className="countdown-unit-label">Detik</span>
                </div>
            </div>
        </div>
    );
};

export default CountdownTimer;
