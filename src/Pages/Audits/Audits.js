import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import Header from '../../components/Common/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUpload, FiDownload, FiRefreshCw, FiSearch, FiEdit2, FiFile, FiX, FiFilter, FiCalendar } from 'react-icons/fi';
import styles from './Audits.module.css';

const Audits = () => {
  const [auditType, setAuditType] = useState('internal');
  const [workbookData, setWorkbookData] = useState({});
  const [sheets, setSheets] = useState(['Summary', 'PIA_F01']);
  const [activeTab, setActiveTab] = useState('Summary');
  const [filteredData, setFilteredData] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [plants, setPlants] = useState([]);
  
  const [uploadDates, setUploadDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('All');

  const [evidenceFiles, setEvidenceFiles] = useState({});
  const [editPopup, setEditPopup] = useState({ isOpen: false, rowIndex: null, field: '', value: '' });
  const [userPlant, setUserPlant] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const currentAuditTypeRef = React.useRef('internal');

  const getAuditTypeFromURL = () => {
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get('type');
    return (type === 'internal' || type === 'external') ? type : 'internal';
  };

  useEffect(() => {
    const newAuditType = getAuditTypeFromURL();
    setAuditType(newAuditType);
    currentAuditTypeRef.current = newAuditType;
    setSelectedDate('All'); 
    loadData(newAuditType);
  }, [location.search]);

  useEffect(() => {
    const checkUser = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) { navigate('/login'); return; }
      const user = JSON.parse(userStr);
      setIsAdmin(user.role === 'Super Admin');
      if (user.role !== 'admin') {
        const plantName = user.PlantName || user.plantName;
        if (plantName) {
          setUserPlant(plantName.trim());
          setSelectedPlant(plantName.trim());
        }
      }
    };
    checkUser();
  }, [navigate]);

  const loadData = async (type = null) => {
    const auditTypeToLoad = type || currentAuditTypeRef.current;
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.getAuditData(auditTypeToLoad);
      const auditSheet = data['PIA_F01'] || [];

      const uniquePlants = ['All Plants', ...new Set(auditSheet.map(item => item.Location).filter(Boolean))];
      setPlants(uniquePlants);

      const uniqueDates = [...new Set(auditSheet.map(item => item.UploadDate).filter(Boolean))];
      uniqueDates.sort((a, b) => new Date(b) - new Date(a));
      setUploadDates(uniqueDates);

      const activeDate = selectedDate === 'All' ? 'All' : (uniqueDates.includes(selectedDate) ? selectedDate : 'All');
      if (activeDate !== selectedDate) setSelectedDate(activeDate);

      setWorkbookData({ ...data });
    } catch (err) {
      setError(err.message);
      setWorkbookData({}); setUploadDates([]);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (searchTerm, plant, dateFilter) => {
    let result = [];
    const isAuditTab = activeTab === 'PIA_F01';
    const isSummaryTab = activeTab === 'Summary';

    let baseAuditRecords = [...(workbookData['PIA_F01'] || [])];

    if (dateFilter && dateFilter !== 'All') {
      baseAuditRecords = baseAuditRecords.filter(row => row.UploadDate === dateFilter);
    }
    if (!isAdmin && userPlant) {
      baseAuditRecords = baseAuditRecords.filter(row => row.Location === userPlant);
    } else if (plant && plant !== 'All Plants') {
      baseAuditRecords = baseAuditRecords.filter(row => row.Location === plant);
    }

    if (isAuditTab) {
      result = baseAuditRecords;
    } else if (isSummaryTab) {
      const summaryMap = {};
      baseAuditRecords.forEach(record => {
        const loc = record.Location || 'Unspecified Location';
        const type = record.NCMinI ? record.NCMinI.trim().toLowerCase() : '';

        if (!summaryMap[loc]) summaryMap[loc] = { Major: 0, Minor: 0, Obs: 0, OFI: 0 };
        if (type.includes('major')) summaryMap[loc].Major++;
        else if (type.includes('minor')) summaryMap[loc].Minor++;
        else if (type.includes('observation') || type.includes('obs')) summaryMap[loc].Obs++;
        else if (type.includes('ofi')) summaryMap[loc].OFI++;
      });

      const header1 = ["ISMS Internal Assessment Observation Summary"];
      const header2 = ["In line with ISO/IEC 27001:2022 - Requirements"];
      const tableHeaders = ["RML Locations", "Major NC", "Minor NC", "Observation", "OFI", "Total"];

      const tableRows = Object.keys(summaryMap).sort().map(loc => {
        const counts = summaryMap[loc];
        const total = counts.Major + counts.Minor + counts.Obs + counts.OFI;
        return [loc, counts.Major, counts.Minor, counts.Obs, counts.OFI, total];
      });

      result = [header1, header2, [], tableHeaders, ...tableRows];
    }
    
    if (searchTerm && result.length > 0 && isAuditTab) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => val && val.toString().toLowerCase().includes(lowerSearch))
      );
    }
    setFilteredData(result);
  };

  useEffect(() => {
    applyFilters(searchTerm, isAdmin ? selectedPlant : userPlant, selectedDate);
  }, [searchTerm, selectedPlant, userPlant, isAdmin, selectedDate, workbookData, activeTab]);

  const handleCellUpdate = async (rowIndex, columnName, value) => {
    const row = filteredData[rowIndex];
    const updatedData = [...(workbookData['PIA_F01'] || [])];
    const dataIndex = updatedData.findIndex(item => item.ID === row.ID);
    
    if (dataIndex !== -1) {
      updatedData[dataIndex][columnName] = value;
      setWorkbookData(prev => ({ ...prev, 'PIA_F01': updatedData }));

      try {
        await api.updateAuditRecord(currentAuditTypeRef.current, updatedData[dataIndex]);
        toast.success('Changes saved');
      } catch (err) {
        toast.error('Failed to save changes');
      }
    }
  };

  const openEditPopup = (rowIndex, field) => { setEditPopup({ isOpen: true, rowIndex, field, value: filteredData[rowIndex][field] || '' }); };
  const closeEditPopup = () => { setEditPopup({ isOpen: false, rowIndex: null, field: '', value: '' }); };
  const saveEditPopup = () => { if (editPopup.rowIndex !== null) handleCellUpdate(editPopup.rowIndex, editPopup.field, editPopup.value); closeEditPopup(); };

  const isAuditTab = activeTab === 'PIA_F01';
  const isSummaryTab = activeTab === 'Summary';

  return (
    <div className={styles.auditDashboard}>
      <Header />
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className={styles.auditContainer}>
        <div className={styles.auditContent}>
          <div className={styles.compactHeader}>
            <div className={styles.titleSection}>
              <h1>{auditType === 'external' ? 'EXTERNAL' : 'INTERNAL'} Audit Management</h1>
            </div>
            
            <div className={styles.controlsSection}>
              {isAuditTab && (
                <div className={styles.searchBox}>
                  <FiSearch className={styles.searchIcon} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              )}

              {uploadDates.length > 0 && (
                <div className={styles.filterDropdown}>
                  <FiCalendar className={styles.filterIcon} />
                  <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                    <option value="All">All Uploads</option>
                    {uploadDates.map((date, index) => (
                      <option key={index} value={date}>{new Date(date).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #e0e0e0', paddingBottom: '5px' }}>
              {sheets.map((sheet, index) => (
                <button key={index} onClick={() => setActiveTab(sheet)}
                  style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'none', fontSize: '15px', fontWeight: '600', borderBottom: activeTab === sheet ? '3px solid #0056b3' : '3px solid transparent', color: activeTab === sheet ? '#0056b3' : '#555' }}
                >
                  {sheet}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className={styles.loadingSpinner}><div className={styles.spinner}></div><p>Loading data...</p></div>
            ) : filteredData.length === 0 ? (
              <div className={styles.noData}><h3>No data found for this tab/filter.</h3></div>
            ) : isAuditTab ? (
              <div className={styles.tableContainer}>
                <table className={styles.auditTable}>
                  <thead>
                    <tr><th>SN</th><th>Location</th><th>Domain</th><th>Audit Date</th><th>NC Type</th><th>Observation</th><th>Root Cause</th><th>Action</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className={styles.tableCell}>{row.SN}</td>
                        <td className={styles.tableCell}>{row.Location}</td>
                        <td className={styles.tableCell}>{row.DomainClauses}</td>
                        <td className={styles.tableCell}>{row.DateOfAudit}</td>
                        <td className={styles.tableCell}>
                          <span className={`${styles.ncBadge} ${styles[row.NCMinI?.toLowerCase().replace(/\s+/g, '-')] || ''}`}>
                            {row.NCMinI}
                          </span>
                        </td>
                        <td className={`${styles.tableCell} ${styles.observationCell}`}>
                          {row.ObservationDescription}
                        </td>
                        <td className={styles.tableCell}>
                          {/* FIXED: Added wrapper div to force vertical stack and center alignment */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.fieldContent} style={{ width: '100%', minWidth: '100px' }}>{row.RootCauseAnalysis}</div>
                            <button className={styles.editButton} onClick={() => openEditPopup(rowIndex, 'RootCauseAnalysis')}>
                              <FiEdit2 /> Edit
                            </button>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                           {/* FIXED: Consistent wrapper for Action cell */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.fieldContent} style={{ width: '100%', minWidth: '100px' }}>{row.CorrectiveAction}</div>
                            <button className={styles.editButton} onClick={() => openEditPopup(rowIndex, 'CorrectiveAction')}>
                              <FiEdit2 /> Edit
                            </button>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <select 
                              value={row.Status || 'Open'} 
                              onChange={(e) => handleCellUpdate(rowIndex, 'Status', e.target.value)}
                              className={`${styles.statusSelect} ${styles[row.Status?.toLowerCase() || 'open']}`}
                              style={{ width: '100px', textAlign: 'center' }}
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.cleanTableContainer}>
                {isSummaryTab && filteredData.length > 0 && (
                  <div className={styles.summaryDocumentHeader}>
                    <h2 className={styles.summaryMainTitle}>{filteredData[0][0]}</h2>
                    <h3 className={styles.summarySubTitle}>{filteredData[1][0]}</h3>
                    <div className={styles.summaryDivider}></div>
                  </div>
                )}

                <table className={styles.cleanTable}>
                  <tbody>
                    {filteredData.map((rowArray, rowIndex) => {
                      if (isSummaryTab && (rowIndex === 0 || rowIndex === 1)) return null;
                      const cells = Array.isArray(rowArray) ? rowArray : Object.values(rowArray);
                      if (cells.every(c => !c || c === '')) return null;
                      let lastIndex = cells.length - 1;
                      while(lastIndex >= 0 && (!cells[lastIndex] || cells[lastIndex] === '')) { lastIndex--; }
                      const trimmedCells = cells.slice(0, lastIndex + 1);
                      return (
                        <tr key={rowIndex}>
                          {trimmedCells.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex} 
                              className={(isSummaryTab && rowIndex === 3) || (!isSummaryTab && rowIndex === 0) ? styles.cleanTableHeader : styles.cleanTableCell}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editPopup.isOpen && (
        <div className={styles.editPopupOverlay}>
          <div className={styles.editPopup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Edit {editPopup.field.replace(/([A-Z])/g, ' $1').trim()}</h3>
                {/* FIXED: Added a clear close icon in the popup header */}
                <button onClick={closeEditPopup} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}><FiX /></button>
            </div>
            <textarea 
              className={styles.popupTextarea}
              value={editPopup.value} 
              onChange={(e) => setEditPopup({...editPopup, value: e.target.value})} 
              autoFocus 
            />
            <div className={styles.popupButtons}>
              <button className={styles.popupCancel} onClick={closeEditPopup}>Cancel</button>
              <button className={styles.popupSave} onClick={saveEditPopup}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audits;
