/**
 * Bloom - Debt Payoff Chart Component
 *
 * Line chart showing debt balance reduction over time.
 * Uses Recharts library for visualization.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import SafeResponsiveContainer from './SafeResponsiveContainer';

function DebtPayoffChart({ data, currencyFormatter }) {
    const { theme } = useTheme();

    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No debt history available for this period
            </div>
        );
    }

    // 1. Filter data to only keep points where balance changed (or first/last)
    const filteredData = data.filter((item, index) => {
        if (index === 0 || index === data.length - 1) return true;
        const prev = data[index - 1];
        return item.total_balance !== prev.total_balance;
    });

    // 2. Transform for Recharts + Add Timestamp + Calculate Payment Amount
    const chartData = filteredData.map((item, index) => {
        let paymentAmount = 0;
        if (index > 0) {
            const prev = filteredData[index - 1];
            // Positive means balance went down (payment)
            paymentAmount = prev.total_balance - item.total_balance;
        }

        return {
            date: item.date,
            timestamp: new Date(item.date).getTime(),
            total_balance: item.total_balance,
            payment_amount: paymentAmount,
            ...item.debts,
        };
    });

    // Get all unique debt names
    const debtNames = Array.from(new Set(data.flatMap((item) => Object.keys(item.debts))));

    // Colors for different debts
    const colors = [
        '#EF4444', // Red-500
        '#F59E0B', // Amber-500
        '#3B82F6', // Blue-500
        '#10B981', // Emerald-500
        '#8B5CF6', // Violet-500
        '#EC4899', // Pink-500
        '#6366F1', // Indigo-500
        '#14B8A6', // Teal-500
    ];

    const formatDateLabel = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
        });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const payment = dataPoint.payment_amount;

            return (
                <div className="bg-white dark:bg-dark-elevated p-3 rounded-lg shadow-lg border border-gray-200 dark:border-dark-surface">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {formatDateLabel(label)}
                    </p>

                    {/* Payment Info (if any) */}
                    {payment > 0 && (
                        <div className="mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                Paid Off: {currencyFormatter(payment)}
                            </p>
                        </div>
                    )}

                    {/* Total Balance */}
                    {payload
                        .filter((p) => p.name === 'Total Debt')
                        .map((entry) => (
                            <p
                                key="total"
                                className="text-sm font-bold mb-2"
                                style={{ color: entry.color }}
                            >
                                {entry.name}: {currencyFormatter(entry.value)}
                            </p>
                        ))}

                    {/* Individual Debts */}
                    {payload
                        .filter((p) => p.name !== 'Total Debt')
                        .map((entry, idx) => (
                            <p key={idx} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {currencyFormatter(entry.value)}
                            </p>
                        ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-80 min-h-[320px] w-full">
            <SafeResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={formatDateLabel}
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickMargin={10}
                    />
                    <YAxis
                        tickFormatter={(val) => currencyFormatter(val).replace('.00', '')}
                        stroke="#9CA3AF"
                        fontSize={12}
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Total Debt Line (Thick, Prominent) */}
                    <Line
                        type="monotone"
                        dataKey="total_balance"
                        name="Total Debt"
                        stroke={theme === 'dark' ? '#F3F4F6' : '#111827'}
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                    />

                    {/* Individual Debt Lines (Thinner) */}
                    {debtNames.map((name, index) => (
                        <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            animationDuration={1500}
                        />
                    ))}
                </LineChart>
            </SafeResponsiveContainer>
        </div>
    );
}

export default DebtPayoffChart;
