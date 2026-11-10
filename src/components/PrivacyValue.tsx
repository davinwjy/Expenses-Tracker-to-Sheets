import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatIdr, formatUsd } from '../lib/formatters';

interface PrivacyValueProps {
  amount: number;
  currency?: 'IDR' | 'USD';
  className?: string;
  customFormat?: (amount: number) => string;
  prefix?: string;
  suffix?: string;
}

export const PrivacyValue: React.FC<PrivacyValueProps> = ({
  amount,
  currency = 'IDR',
  className = '',
  customFormat,
  prefix = '',
  suffix = '',
}) => {
  const { isPrivacyMode } = useFinance();

  const formattedStr = customFormat
    ? customFormat(amount)
    : currency === 'USD'
    ? formatUsd(amount)
    : formatIdr(amount);

  return (
    <span
      className={`inline-block tabular-nums transition-all duration-200 ${
        isPrivacyMode ? 'privacy-blur' : ''
      } ${className}`}
    >
      {prefix}{formattedStr}{suffix}
    </span>
  );
};
