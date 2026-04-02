import { useEffect, useState } from 'react';
import { useAuthStore } from '../auth/auth.store';
import apiClient from '../../shared/services/apiClient';

export default function AnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'detail'

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, viewMode]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'summary') {
        const response = await apiClient.get(
          `/analytics/shop/${user?.shop_username}/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`
        );
        setAnalytics(response.data.data);
      } else {
        const response = await apiClient.get(
          `/analytics/shop/${user?.shop_username}/details?limit=50&offset=0`
        );
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-error">Error: {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container">
        <div className="analytics-empty">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Menu Analytics</h1>
        <div className="analytics-controls">
          <div className="control-group">
            <label>View Mode:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <option value="summary">Summary</option>
              <option value="detail">Detailed Records</option>
            </select>
          </div>

          {viewMode === 'summary' && (
            <div className="control-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <label>End Date:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>

      {viewMode === 'summary' && (
        <div className="analytics-summary">
          <div className="summary-card main">
            <h2>Total Menu Views</h2>
            <div className="summary-value">{analytics.total_views || 0}</div>
          </div>

          <div className="summary-cards-grid">
            <div className="summary-card">
              <h3>Device Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(analytics.device_breakdown || {}).map(([device, count]) => (
                  <div key={device} className="breakdown-item">
                    <span className="device-type">{device}:</span>
                    <span className="device-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <h3>Operating Systems</h3>
              <div className="breakdown-list">
                {Object.entries(analytics.os_breakdown || {}).map(([os, count]) => (
                  <div key={os} className="breakdown-item">
                    <span className="os-type">{os}:</span>
                    <span className="os-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <h3>Top Browsers</h3>
              <div className="breakdown-list">
                {Object.entries(analytics.browser_breakdown || {}).map(([browser, count]) => (
                  <div key={browser} className="breakdown-item">
                    <span className="browser-type">{browser}:</span>
                    <span className="browser-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <h3>Top Countries</h3>
              <div className="breakdown-list">
                {Object.entries(analytics.country_breakdown || {})
                  .slice(0, 5)
                  .map(([country, count]) => (
                    <div key={country} className="breakdown-item">
                      <span className="country-name">{country || 'Unknown'}:</span>
                      <span className="country-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {analytics.daily_views && Object.keys(analytics.daily_views).length > 0 && (
            <div className="summary-card full-width">
              <h3>Daily Views</h3>
              <div className="daily-views-chart">
                {Object.entries(analytics.daily_views)
                  .sort()
                  .map(([date, views]) => (
                    <div key={date} className="daily-view-bar">
                      <div className="bar-label">{new Date(date).toLocaleDateString()}</div>
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${
                              (views / Math.max(...Object.values(analytics.daily_views))) * 100
                            }%`,
                          }}
                        ></div>
                        <div className="bar-value">{views}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'detail' && (
        <div className="analytics-detail">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Device Type</th>
                <th>Browser</th>
                <th>OS</th>
                <th>Country</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(analytics) &&
                analytics.map((record, idx) => (
                  <tr key={idx}>
                    <td>{new Date(record.tracked_at).toLocaleString()}</td>
                    <td>
                      <span className={`device-badge ${record.device_type}`}>
                        {record.device_type}
                      </span>
                    </td>
                    <td>{record.browser || 'N/A'}</td>
                    <td>{record.os || 'N/A'}</td>
                    <td>{record.country || 'N/A'}</td>
                    <td className="ip-address">{record.ip_address || 'N/A'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .analytics-container {
          padding: 24px;
          background: #0f1117;
          border-radius: 12px;
          color: #c9d1d9;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .analytics-header h1 {
          margin: 0;
          font-size: 28px;
          color: #f0f6fc;
        }

        .analytics-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .control-group label {
          font-size: 14px;
          color: #8b949e;
        }

        .control-group input,
        .control-group select {
          padding: 6px 12px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #c9d1d9;
          font-size: 14px;
          cursor: pointer;
        }

        .control-group input:focus,
        .control-group select:focus {
          outline: none;
          border-color: #58a6ff;
          box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
        }

        .analytics-summary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .summary-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 16px;
        }

        .summary-card.main {
          background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
          border: 1px solid #30363d;
          text-align: center;
        }

        .summary-card.main h2 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #8b949e;
        }

        .summary-value {
          font-size: 48px;
          font-weight: bold;
          color: #58a6ff;
        }

        .summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .summary-card h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #f0f6fc;
          border-bottom: 1px solid #30363d;
          padding-bottom: 8px;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
        }

        .breakdown-item span:first-child {
          color: #8b949e;
          flex: 1;
        }

        .breakdown-item span:last-child {
          color: #58a6ff;
          font-weight: 600;
          min-width: 40px;
          text-align: right;
        }

        .summary-card.full-width {
          grid-column: 1 / -1;
        }

        .daily-views-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          min-height: 200px;
          padding: 16px 0;
          overflow-x: auto;
        }

        .daily-view-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 50px;
          flex: 1;
        }

        .bar-label {
          font-size: 12px;
          color: #8b949e;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          white-space: nowrap;
        }

        .bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
          width: 100%;
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, #58a6ff 0%, #1f6feb 100%);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          transition: all 0.3s ease;
        }

        .bar-value {
          font-size: 12px;
          color: #58a6ff;
          font-weight: 600;
        }

        .analytics-detail {
          overflow-x: auto;
        }

        .analytics-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .analytics-table thead {
          background: #0d1117;
          border-bottom: 2px solid #30363d;
        }

        .analytics-table th {
          padding: 12px;
          text-align: left;
          color: #58a6ff;
          font-weight: 600;
        }

        .analytics-table td {
          padding: 12px;
          border-bottom: 1px solid #30363d;
          color: #c9d1d9;
        }

        .analytics-table tbody tr:hover {
          background: #0d1117;
        }

        .device-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .device-badge.mobile {
          background: #238636;
          color: #aff5b4;
        }

        .device-badge.tablet {
          background: #1f6feb;
          color: #cae8ff;
        }

        .device-badge.desktop {
          background: #6e40aa;
          color: #d8b9ff;
        }

        .ip-address {
          font-family: monospace;
          font-size: 12px;
          color: #8b949e;
        }

        .analytics-loading,
        .analytics-error,
        .analytics-empty {
          padding: 24px;
          text-align: center;
          color: #8b949e;
          font-size: 16px;
        }

        .analytics-error {
          color: #f85149;
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid #da3633;
          border-radius: 6px;
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .analytics-controls {
            width: 100%;
            flex-direction: column;
          }

          .control-group {
            width: 100%;
            justify-content: space-between;
          }

          .summary-cards-grid {
            grid-template-columns: 1fr;
          }

          .daily-views-chart {
            overflow-x: scroll;
          }
        }
      `}</style>
    </div>
  );
}
