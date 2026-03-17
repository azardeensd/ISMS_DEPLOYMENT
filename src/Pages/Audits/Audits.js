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
  const [sheets, setSheets] = useState(['Front Page', 'Version Control', 'Summary', 'PIA_F01']);
  const [activeTab, setActiveTab] = useState('Front Page');
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
      // Step 1: Fetch core database tracker records
      const data = await api.getAuditData(auditTypeToLoad);
      const auditSheet = data['PIA_F01'] || [];

      // Extract filterable metadata
      const uniquePlants = ['All Plants', ...new Set(auditSheet.map(item => item.Location).filter(Boolean))];
      setPlants(uniquePlants);

      const uniqueDates = [...new Set(auditSheet.map(item => item.UploadDate).filter(Boolean))];
      uniqueDates.sort((a, b) => new Date(b) - new Date(a));
      setUploadDates(uniqueDates);

      const activeDate = selectedDate === 'All' ? 'All' : (uniqueDates.includes(selectedDate) ? selectedDate : 'All');
      if (activeDate !== selectedDate) setSelectedDate(activeDate);

      // Save Initial State
      setWorkbookData({ ...data });
    } catch (err) {
      setError(err.message);
      setWorkbookData({}); setUploadDates([]);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Reactively fetch Front Page & Version Control when the user changes the Date!
  useEffect(() => {
    const fetchLayoutsForDate = async () => {
      if (!workbookData['PIA_F01']) return; 
      
      try {
        const layouts = await api.getFileLayouts(currentAuditTypeRef.current, selectedDate);
        setWorkbookData(prev => ({
          ...prev,
          ...layouts
        }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchLayoutsForDate();
  }, [selectedDate, currentAuditTypeRef.current]);

  const applyFilters = (searchTerm, plant, dateFilter) => {
    let result = [];
    
    const isAuditTab = activeTab === 'PIA_F01';
    const isSummaryTab = activeTab === 'Summary';
    const isFrontPage = activeTab === 'Front Page';
    const isVersionControl = activeTab === 'Version Control';

    let baseAuditRecords = [...(workbookData['PIA_F01'] || [])];

    // Filter Base DB Records
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
      const header2 = ["In line with ISO/IEC 27001:2022 - Information security management systems Requirements"];
      const tableHeaders = ["RML Locations", "Major NC", "Minor NC", "Observation", "OFI", "Total"];

      const tableRows = Object.keys(summaryMap).sort().map(loc => {
        const counts = summaryMap[loc];
        const total = counts.Major + counts.Minor + counts.Obs + counts.OFI;
        return [loc, counts.Major, counts.Minor, counts.Obs, counts.OFI, total];
      });

      result = [header1, header2, [], tableHeaders, ...tableRows];
    } else if (isFrontPage) {
      const key = Object.keys(workbookData).find(k => k.toLowerCase().includes('front'));
      result = key ? workbookData[key] : [];
    } else if (isVersionControl) {
      const key = Object.keys(workbookData).find(k => k.toLowerCase().includes('version'));
      result = key ? workbookData[key] : [];
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

  const handleEvidenceFileChange = (e, rowIndex) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceFiles(prev => ({ ...prev, [rowIndex]: file }));
      toast.info(`File selected: ${file.name}`);
    }
  };

  const handleEvidenceUpload = async (rowIndex) => {
    if (!evidenceFiles[rowIndex]) return;
    const row = filteredData[rowIndex];
    if (!row.ID) return toast.error('Invalid record');

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', evidenceFiles[rowIndex]);
      formData.append('record_id', row.ID.toString());
      formData.append('audit_type', currentAuditTypeRef.current);

      const response = await api.uploadEvidence(formData);
      
      const updatedData = [...(workbookData['PIA_F01'] || [])];
      const dataIndex = updatedData.findIndex(item => item.ID === row.ID);
      
      if (dataIndex !== -1) {
        const today = new Date().toISOString().split('T')[0];
        updatedData[dataIndex] = { ...updatedData[dataIndex], Evidence: response.filename, Status: 'Closed', ClosingDates: today };
        
        setWorkbookData(prev => ({ ...prev, 'PIA_F01': updatedData }));
        setEvidenceFiles(prev => { const newState = {...prev}; delete newState[rowIndex]; return newState; });
        toast.success('Evidence uploaded successfully!');
      }
    } catch (err) {
      toast.error('Failed to upload evidence');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) { setFile(selectedFile); toast.info(`File selected`); }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setIsLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setFile(null); setFileKey(Date.now());
      await api.uploadAuditFile(formData, currentAuditTypeRef.current);
      
      setSelectedDate('All'); 
      await loadData(currentAuditTypeRef.current);
      
      toast.success('File uploaded and parsed successfully!');
    } catch (err) {
      setError(err.message); toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatUploadDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const isAuditTab = activeTab === 'PIA_F01';
  const isSummaryTab = activeTab === 'Summary';
  const isFrontPage = activeTab === 'Front Page';
  
  const showFilters = isAuditTab || isSummaryTab || activeTab === 'Version Control' || isFrontPage;

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
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}

              {showFilters && uploadDates.length > 0 && (
                <div className={styles.filterDropdown}>
                  <FiCalendar className={styles.filterIcon} />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    <option value="All">All Uploads</option>
                    {uploadDates.map((date, index) => (
                      <option key={index} value={date}>
                        {formatUploadDate(date)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isAdmin && (isAuditTab || isSummaryTab) && (
                <div className={styles.filterDropdown}>
                  <FiFilter className={styles.filterIcon} />
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                  >
                    {plants.map((plant, index) => (
                      <option key={index} value={plant}>{plant}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {isAdmin && (
                <div className={styles.uploadControl}>
                  <label className={styles.fileInputLabel}>
                    <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} key={fileKey} />
                    <span className={styles.fileInputButton}><FiUpload /> Select Excel File</span>
                  </label>
                  <button onClick={handleFileUpload} disabled={!file || isLoading} className={styles.uploadButton}>
                    {isLoading ? <FiRefreshCw className={styles.spinIcon} /> : 'Upload'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.tableWrapper}>
            {sheets.length > 0 && (
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #e0e0e0', paddingBottom: '5px', overflowX: 'auto' }}>
                {sheets.map((sheet, index) => (
                  <button key={index} onClick={() => setActiveTab(sheet)}
                    style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'none', fontSize: '15px', fontWeight: '600', borderBottom: activeTab === sheet ? '3px solid #0056b3' : '3px solid transparent', color: activeTab === sheet ? '#0056b3' : '#555', transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            )}
            
            {isLoading ? (
              <div className={styles.loadingSpinner}><div className={styles.spinner}></div><p>Loading data...</p></div>
            ) : filteredData.length === 0 ? (
              <div className={styles.noData}><h3>No data found for this tab/filter.</h3></div>
            ) : isAuditTab ? (
              // -------- AUDIT RECORDS TABLE --------
              <div className={styles.tableContainer}>
                <table className={styles.auditTable}>
                  <thead>
                  <tr>
                    <th>SN</th><th>Location</th><th>Domain/Clauses</th><th>Date of Audit</th><th>NC Type</th><th>Observation</th><th>Root Cause Analysis</th><th>Corrective Action</th><th>Preventive Action</th><th>Department Name</th><th>Closing Date</th><th>Status</th><th>Evidence</th>
                  </tr>
                </thead>
                  <tbody>
                    {filteredData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className={styles.tableCell}>{row.SN}</td>
                        <td className={styles.tableCell}>{row.Location}</td>
                        <td className={styles.tableCell}>{row.DomainClauses}</td>
                        <td className={styles.tableCell}>{row.DateOfAudit}</td>
                        <td className={styles.tableCell}><span className={`${styles.ncBadge} ${styles[row.NCMinI?.toLowerCase().replace(' ', '-')]}`}>{row.NCMinI}</span></td>
                        <td className={`${styles.tableCell} ${styles.observationCell}`}>{row.ObservationDescription}</td>
                        <td className={styles.tableCell}><div className={styles.editFieldContainer}><div className={styles.fieldContent}>{row.RootCauseAnalysis}</div><button className={styles.editButton} onClick={() => openEditPopup(rowIndex, 'RootCauseAnalysis')}><FiEdit2 /> Edit</button></div></td>
                        <td className={styles.tableCell}><div className={styles.editFieldContainer}><div className={styles.fieldContent}>{row.CorrectiveAction}</div><button className={styles.editButton} onClick={() => openEditPopup(rowIndex, 'CorrectiveAction')}><FiEdit2 /> Edit</button></div></td>
                        <td className={styles.tableCell}><div className={styles.editFieldContainer}><div className={styles.fieldContent}>{row.PreventiveAction}</div><button className={styles.editButton} onClick={() => openEditPopup(rowIndex, 'PreventiveAction')}><FiEdit2 /> Edit</button></div></td>
                        <td className={styles.tableCell}>{row.DepartmentName}</td>
                        <td className={`${styles.tableCell} ${styles.editableCell}`}><input type="date" value={row.ClosingDates || ''} onChange={(e) => handleCellUpdate(rowIndex, 'ClosingDates', e.target.value)} className={styles.dateInput} /></td>
                        <td className={`${styles.tableCell} ${styles.editableCell}`}><select value={row.Status || 'Open'} onChange={(e) => handleCellUpdate(rowIndex, 'Status', e.target.value)} className={`${styles.statusSelect} ${styles[row.Status?.toLowerCase()]}`} disabled={!isAdmin && row.Status === 'Closed'}><option value="Open">Open</option><option value="Closed">Closed</option></select></td>
                        <td className={`${styles.tableCell} ${styles.evidenceCell}`}>
                          {row.Evidence ? (
                            <div className={styles.evidenceDownload}><a href={`${api.baseUrl}/uploads/${row.Evidence}`} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}><FiDownload /> Download</a>{isAdmin && (<button className={styles.clearEvidence} onClick={() => handleCellUpdate(rowIndex, 'Evidence', '')}><FiX /></button>)}</div>
                          ) : (
                            <div className={styles.evidenceUpload}><input type="file" id={`evidence-${rowIndex}`} accept=".pdf,.pptx,.png,.jpeg,.jpg" onChange={(e) => handleEvidenceFileChange(e, rowIndex)} style={{ display: 'none' }}/><label htmlFor={`evidence-${rowIndex}`} className={styles.fileLabel}><FiFile /> Choose File</label>{evidenceFiles[rowIndex] && (<button className={styles.uploadButton} onClick={() => handleEvidenceUpload(rowIndex)} disabled={isLoading}><FiUpload /> Upload</button>)}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isFrontPage ? (
              // -------- FRONT PAGE (Clean Document Text, No Table) --------
              <div className={styles.frontPageContainer}>
                {filteredData.map((rowArray, rowIndex) => {
                  const cells = Array.isArray(rowArray) ? rowArray : Object.values(rowArray);
                  const content = cells.filter(cell => cell !== null && cell !== '').join('    ');
                  if (!content.trim()) return null; 
                  return (
                    <div key={rowIndex} className={styles.frontPageRow}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : (
              // -------- SUMMARY & VERSION CONTROL (Clean Minimalist Table) --------
              <div className={styles.cleanTableContainer}>
                <table className={styles.cleanTable}>
                  <tbody>
                    {filteredData.map((rowArray, rowIndex) => {
                      const cells = Array.isArray(rowArray) ? rowArray : Object.values(rowArray);
                      if (cells.every(c => !c || c === '')) return null;

                      // FIX: Trim any trailing empty blank columns from the right side for a compact look!
                      let lastIndex = cells.length - 1;
                      while(lastIndex >= 0 && (!cells[lastIndex] || cells[lastIndex] === '')) {
                        lastIndex--;
                      }
                      const trimmedCells = cells.slice(0, lastIndex + 1);

                      return (
                        <tr key={rowIndex}>
                          {trimmedCells.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex} 
                              className={rowIndex === 0 || (cellIndex === 0 && cell) ? styles.cleanTableHeader : styles.cleanTableCell}
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
            <h3>Edit {editPopup.field.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <textarea value={editPopup.value} onChange={(e) => setEditPopup({...editPopup, value: e.target.value})} className={styles.popupTextarea} autoFocus />
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
