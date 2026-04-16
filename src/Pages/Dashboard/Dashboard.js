import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import Header from '../../components/Common/Header';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const Dashboard = () => {
  const [auditData, setAuditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState([]);
  const [auditType, setAuditType] = useState('internal');
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAuditData();
  }, [auditType, timeRange]);

  useEffect(() => {
    applyFilters();
  }, [auditData, selectedLocation]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      
      // Fetch data based on selected type (Internal/External)
      const response = await api.getAuditData(auditType);
      
      /**
       * FIX: api.getAuditData returns an object: { 'PIA_F01': [...] }
       * We need to extract the array from that specific key.
       */
      const rawRecords = response['PIA_F01'] || [];
      
      if (!Array.isArray(rawRecords)) {
        console.error('Data received is not in the expected format');
        setAuditData([]);
        setLoading(false);
        return;
      }
      
      let processedData = [...rawRecords];
      
      // Filter by time range - using UploadDate from Api.js mapping
      if (timeRange !== 'all') {
        const now = new Date();
        const limitDate = new Date();
        
        if (timeRange === 'last30') limitDate.setDate(now.getDate() - 30);
        else if (timeRange === 'last90') limitDate.setDate(now.getDate() - 90);
        else if (timeRange === 'lastYear') limitDate.setFullYear(now.getFullYear() - 1);

        processedData = processedData.filter(item => {
          const uDate = item.UploadDate;
          return uDate && new Date(uDate) > limitDate;
        });
      }
      
      setAuditData(processedData);
      
      // Extract unique locations for the dropdown
      const uniqueLocations = [...new Set(processedData.map(item => item.Location).filter(Boolean))];
      setLocations(uniqueLocations);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      setAuditData([]);
      setFilteredData([]);
      setLoading(false);
      alert('Error fetching data: ' + error.message);
    }
  };

  const applyFilters = () => {
    if (!auditData || auditData.length === 0) {
      setFilteredData([]);
      return;
    }
    
    let filtered = [...auditData];
    
    // Apply location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.Location === selectedLocation);
    }
    
    setFilteredData(filtered);
  };
  
  const getLocationData = () => {
    if (!filteredData.length) return [];
    const locationMap = {};
    filteredData.forEach(item => {
      const loc = item.Location || 'Unknown';
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    return Object.entries(locationMap).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getNCTypeData = () => {
    if (!filteredData.length) return [];
    const ncTypeMap = {};
    filteredData.forEach(item => {
      const type = item.NCMinI || 'Unknown';
      ncTypeMap[type] = (ncTypeMap[type] || 0) + 1;
    });
    return Object.entries(ncTypeMap).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getStatusData = () => {
    if (!filteredData.length) return [];
    const statusMap = {};
    filteredData.forEach(item => {
      const status = item.Status || 'Open';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, count]) => ({ name, count }));
  };

  const getSummaryStats = () => {
    if (!filteredData.length) {
      return { totalNCs: 0, openNCs: 0, closedNCs: 0, locationsCount: 0, closureRate: 0 };
    }

    const totalNCs = filteredData.length;
    const openNCs = filteredData.filter(item => (item.Status || '').toLowerCase() === 'open').length;
    const closedNCs = filteredData.filter(item => (item.Status || '').toLowerCase() === 'closed').length;
    const locationsCount = new Set(filteredData.map(item => item.Location)).size;

    return {
      totalNCs,
      openNCs,
      closedNCs,
      locationsCount,
      closureRate: totalNCs > 0 ? Math.round((closedNCs / totalNCs) * 100) : 0
    };
  };

  const stats = getSummaryStats();
  const locationChartData = getLocationData();
  const ncTypeChartData = getNCTypeData();
  const statusChartData = getStatusData();

  return (
    <>
      <Header />
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2>{auditType === 'internal' ? 'ISMS INTERNAL AUDIT REPORTS' : 'ISMS EXTERNAL AUDIT REPORTS'}</h2>
          <div className={styles.dashboardControls}>
            <select value={auditType} onChange={(e) => setAuditType(e.target.value)} className={styles.dashboardSelect}>
              <option value="internal">Internal Audit</option>
              <option value="external">External Audit</option>
            </select>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className={styles.dashboardSelect}>
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="lastYear">Last Year</option>
            </select>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className={styles.dashboardSelect}>
              <option value="all">All Locations</option>
              {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.dashboardLoading}>Loading audit data...</div>
        ) : (
          <>
            <div className={styles.dashboardSummary}>
              <div className={styles.summaryCard}><h3>Total NCs</h3><p className={styles.summaryValue}>{stats.totalNCs}</p></div>
              <div className={styles.summaryCard}><h3>Open NCs</h3><p className={styles.summaryValue}>{stats.openNCs}</p></div>
              <div className={styles.summaryCard}><h3>Closed NCs</h3><p className={styles.summaryValue}>{stats.closedNCs}</p></div>
              <div className={styles.summaryCard}><h3>Closure Rate</h3><p className={styles.summaryValue}>{stats.closureRate}%</p></div>
              <div className={styles.summaryCard}><h3>Locations</h3><p className={styles.summaryValue}>{stats.locationsCount}</p></div>
            </div>

            {filteredData.length > 0 ? (
              <div className={styles.chartsContainer}>
                <div className={styles.chartRow}>
                  <div className={styles.chartWrapper}>
                    <h3>NC by Type</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={ncTypeChartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Count" fill="#3c4e7c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className={styles.chartWrapper}>
                    <h3>NC by Status</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%" cy="50%"
                          outerRadius={100}
                          dataKey="count"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusChartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartRow}>
                  <div className={styles.chartWrapper}>
                    <h3>NC by Location</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={locationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.dashboardNoData}>
                <p>No audit data found for the selected criteria.</p>
                <button onClick={fetchAuditData} className={styles.refreshButton}>Refresh Data</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;
