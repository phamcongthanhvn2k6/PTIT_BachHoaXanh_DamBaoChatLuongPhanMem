import React, { useState, useEffect } from 'react';

type HotDealCountdownProps = {
  endDate?: string;
};

export const HotDealCountdown: React.FC<HotDealCountdownProps> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endDate) {
      setTimeLeft('Không thời hạn');
      return;
    }

    const end = new Date(endDate).getTime();

    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Đã kết thúc');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (num: number) => String(num).padStart(2, '0');

      if (h > 48) {
        setTimeLeft(`Còn ${Math.floor(h / 24)} ngày`);
      } else if (h > 0) {
        setTimeLeft(`Kết thúc sau ${pad(h)}:${pad(m)}:${pad(s)}`);
      } else {
        setTimeLeft(`Kết thúc sau ${pad(m)}:${pad(s)}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (isExpired) {
    return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{timeLeft}</span>;
  }

  return (
    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1 w-max">
      <span className="material-symbols-outlined text-[12px]">schedule</span>
      {timeLeft}
    </span>
  );
};
