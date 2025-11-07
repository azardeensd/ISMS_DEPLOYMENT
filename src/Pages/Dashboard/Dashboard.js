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
  }, [auditData, selectedLocation, timeRange]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      
      const data = await api.getAuditData(auditType);
      
      if (!data || !Array.isArray(data)) {
        console.error('No data received from API or data is not an array');
        setAuditData([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetched audit data:', data);
      
      let filteredData = Array.isArray(data) ? data : [];
      
      // Filter by time range - using upload_date from Supabase
      const now = new Date();
      if (timeRange === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredData = filteredData.filter(item => {
          const uploadDate = item.UploadDate || item.upload_date;
          return uploadDate && new Date(uploadDate) > thirtyDaysAgo;
        });
      } else if (timeRange === 'last90') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        filteredData = filteredData.filter(item => {
          const uploadDate = item.UploadDate || item.upload_date;
          return uploadDate && new Date(uploadDate) > ninetyDaysAgo;
        });
      } else if (timeRange === 'lastYear') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        filteredData = filteredData.filter(item => {
          const uploadDate = item.UploadDate || item.upload_date;
          return uploadDate && new Date(uploadDate) > oneYearAgo;
        });
      }
      
      setAuditData(filteredData);
      const uniqueLocations = [...new Set(filteredData.map(item => item.Location || item.location || 'Unknown'))];
      setLocations(uniqueLocations);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      setAuditData([]);
      setFilteredData([]);
      setLoading(false);
      
      // Handle Supabase specific errors
      if (error.message && error.message.includes('Failed to fetch')) {
        alert('Unable to connect to the database. Please check your internet connection and try again.');
      } else {
        alert('Error fetching data: ' + error.message);
      }
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
      filtered = filtered.filter(item => {
        const location = item.Location || item.location;
        return location === selectedLocation;
      });
    }
    
    // Re-apply time filter (in case timeRange changed without re-fetch)
    const now = new Date();
    if (timeRange === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(item => {
        const uploadDate = item.UploadDate || item.upload_date;
        return uploadDate && new Date(uploadDate) > thirtyDaysAgo;
      });
    } else if (timeRange === 'last90') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      filtered = filtered.filter(item => {
        const uploadDate = item.UploadDate || item.upload_date;
        return uploadDate && new Date(uploadDate) > ninetyDaysAgo;
      });
    } else if (timeRange === 'lastYear') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filtered = filtered.filter(item => {
        const uploadDate = item.UploadDate || item.upload_date;
        return uploadDate && new Date(uploadDate) > oneYearAgo;
      });
    }
    
    setFilteredData(filtered);
  };
  
  const getLocationData = () => {
    if (!filteredData || filteredData.length === 0) return [];
    const locationMap = {};

    filteredData.forEach(item => {
      const location = item.Location || item.location || 'Unknown';
      locationMap[location] = (locationMap[location] || 0) + 1;
    });
    
    return Object.entries(locationMap).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  };

  const getNCTypeData = () => {
    if (!filteredData || filteredData.length === 0) return [];
    const ncTypeMap = {};

    filteredData.forEach(item => {
      const ncType = item.NCMinI || item.nc_min_i || 'Unknown';
      ncTypeMap[ncType] = (ncTypeMap[ncType] || 0) + 1;
    });
    
    return Object.entries(ncTypeMap).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  };

  const getStatusData = () => {
    if (!filteredData || filteredData.length === 0) return [];
    const statusMap = {};

    filteredData.forEach(item => {
      const status = item.Status || item.status || 'Open';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    
    return Object.entries(statusMap).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  };

  const getSummaryStats = () => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalNCs: 0,
        openNCs: 0,
        closedNCs: 0,
        locations: 0,
        closureRate: 0
      };
    }

    const totalNCs = filteredData.length;
    const openNCs = filteredData.filter(item => {
      const status = item.Status || item.status || 'Open';
      return status.toLowerCase() === 'open';
    }).length;
    
    const closedNCs = filteredData.filter(item => {
      const status = item.Status || item.status || '';
      return status.toLowerCase() === 'closed';
    }).length;
    
    const locations = new Set(filteredData.map(item => item.Location || item.location)).size;

    return {
      totalNCs,
      openNCs,
      closedNCs,
      locations,
      closureRate: totalNCs > 0 ? Math.round((closedNCs / totalNCs) * 100) : 0
    };
  };

  const getHeaderTitle = (type) => {
    const auditTitles = {
      internal: 'ISMS INTERNAL AUDIT REPORTS',
      external: 'ISMS EXTERNAL AUDIT REPORTS'
    };
    return auditTitles[type] || 'ISMS AUDIT REPORTS';
  };

  const stats = getSummaryStats();
  const locationData = getLocationData();
  const ncTypeData = getNCTypeData();
  const statusData = getStatusData();

  return (
    <>
      <Header />
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardHeader}>
          <h2>{getHeaderTitle(auditType)}</h2>
          <div className={styles.dashboardControls}>
            <select 
              value={auditType} 
              onChange={(e) => setAuditType(e.target.value)}
              className={styles.dashboardSelect}
            >
              <option value="internal">Internal Audit</option>
              <option value="external">External Audit</option>
            </select>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className={styles.dashboardSelect}
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="lastYear">Last Year</option>
            </select>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className={styles.dashboardSelect}
            >
              <option value="all">All Locations</option>
              {locations.map((location, index) => (
                <option key={index} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.dashboardLoading}>Loading audit data...</div>
        ) : (
          <>
            <div className={styles.dashboardSummary}>
              <div className={styles.summaryCard}>
                <h3>Total NCs</h3>
                <p className={styles.summaryValue}>{stats.totalNCs}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Open NCs</h3>
                <p className={styles.summaryValue}>{stats.openNCs}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Closed NCs</h3>
                <p className={styles.summaryValue}>{stats.closedNCs}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Closure Rate</h3>
                <p className={styles.summaryValue}>{stats.closureRate}%</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Locations</h3>
                <p className={styles.summaryValue}>{stats.locations}</p>
              </div>
            </div>

            {filteredData.length > 0 ? (
              <div className={styles.chartsContainer}>
                <div className={styles.chartRow}>
                  <div className={styles.chartWrapper}>
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                      </svg>
                      NC by Type
                    </h3>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={ncTypeData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Count" fill="#3c4e7c" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className={styles.chartWrapper}>
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      NC by Status
                    </h3>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Additional chart for locations */}
                <div className={styles.chartRow}>
                  <div className={styles.chartWrapper}>
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      NC by Location
                    </h3>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={locationData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
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
              </div>
            ) : (
              <div className={styles.dashboardNoData}>
                <p>No audit data found for the selected criteria.</p>
                <button onClick={fetchAuditData} className={styles.refreshButton}>
                  Refresh Data
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;