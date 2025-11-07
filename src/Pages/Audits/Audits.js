import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import Header from '../../components/Common/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUpload, FiDownload, FiRefreshCw, FiSearch, FiEdit2, FiFile, FiX, FiFilter } from 'react-icons/fi';
import styles from './Audits.module.css';

const Audits = () => {
  const [auditType, setAuditType] = useState('internal');
  const [auditData, setAuditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [plants, setPlants] = useState([]);
  const [users, setUsers] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState({});
  const [editPopup, setEditPopup] = useState({
    isOpen: false,
    rowIndex: null,
    field: '',
    value: ''
  });
  const [userPlant, setUserPlant] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Get audit type from URL parameters - FIXED: Single source of truth
  const getAuditTypeFromURL = () => {
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get('type');
    return (type === 'internal' || type === 'external') ? type : 'internal';
  };

  // FIXED: Use a ref to track the current audit type for API calls
  const currentAuditTypeRef = React.useRef('internal');

  // FIXED: Single useEffect to handle URL changes and data loading
  useEffect(() => {
    const newAuditType = getAuditTypeFromURL();
    console.log('URL changed, new audit type:', newAuditType);
    
    // Update both state and ref simultaneously
    setAuditType(newAuditType);
    currentAuditTypeRef.current = newAuditType;
    
    // Load data with the correct audit type
    loadData(newAuditType);
  }, [location.search]);

  // Get user info and plant name
  useEffect(() => {
    const checkUser = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userStr);
      setIsAdmin(user.role === 'Super Admin');
      console.log('User role:', user.role, 'Is admin:', user.role === 'admin');
      
      // Set user's plant name for standard users
      if (user.role !== 'admin') {
        const plantName = user.PlantName || user.plantName;
        if (plantName) {
          setUserPlant(plantName.trim());
          setSelectedPlant(plantName.trim());
          console.log('User plant set to:', plantName.trim());
        } else {
          console.warn('No plant name found for standard user');
        }
      }
    };

    checkUser();
  }, [navigate]);

  // FIXED: loadData now accepts auditType as parameter
  const loadData = async (type = null) => {
    const auditTypeToLoad = type || currentAuditTypeRef.current;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Loading ${auditTypeToLoad} audit data from API...`);
      const data = await api.getAuditData(auditTypeToLoad);
      console.log(`Received ${data.length} records for ${auditTypeToLoad} audits`);
      
      setAuditData(Array.isArray(data) ? data : []);
      
      if (data.length > 0) {
        setLastUploadDate(data[0].lastUploadDate || null);
      }

      // Extract unique plants from the data
      const uniquePlants = ['All Plants', ...new Set(data.map(item => item.Location).filter(Boolean))];
      setPlants(uniquePlants);
      console.log('Available plants:', uniquePlants);
      
      // Apply filters with user's plant restriction for standard users
      applyFilters(searchTerm, isAdmin ? selectedPlant : userPlant, data);
      
      // Debug current state
      debugState();
    } catch (err) {
      console.error('Error loading audit data:', err);
      setError(err.message);
      setAuditData([]);
      setFilteredData([]);
      toast.error(`Failed to load ${auditTypeToLoad} audit data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (searchTerm, plant, data = auditData) => {
    let result = [...data];
    
    console.log(`Applying filters - Search: "${searchTerm}", Plant: "${plant}"`);
    console.log('Initial data count:', result.length);
    
    // For standard users, always filter by their plant
    if (!isAdmin && userPlant) {
      result = result.filter(row => row.Location === userPlant);
      console.log(`Filtered by user plant (${userPlant}):`, result.length);
    } else if (plant && plant !== 'All Plants') {
      // For admin users, apply selected plant filter
      result = result.filter(row => row.Location === plant);
      console.log(`Filtered by selected plant (${plant}):`, result.length);
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(
          val => val && val.toString().toLowerCase().includes(lowerSearch)
      ));
      console.log(`Filtered by search term:`, result.length);
    }
    
    setFilteredData(result);
    console.log('Final filtered data count:', result.length);
  };

  useEffect(() => {
    // Apply filters when search term or plant selection changes
    applyFilters(searchTerm, isAdmin ? selectedPlant : userPlant);
  }, [searchTerm, selectedPlant, userPlant, isAdmin, auditData]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await api.getAllUsers();
        setUsers(userList);
        console.log('Loaded users:', userList.length);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };

    fetchUsers();
  }, []);

  const handleEvidenceFileChange = (e, rowIndex) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceFiles(prev => ({
        ...prev,
        [rowIndex]: file
      }));
      toast.info(`File selected for row ${rowIndex + 1}: ${file.name}`);
    }
  };

  const handleEvidenceUpload = async (rowIndex) => {
    if (!evidenceFiles[rowIndex]) {
      toast.warning('Please select a file first');
      return;
    }

    const row = filteredData[rowIndex];
    
    // Debug the row data
    console.log('Uploading evidence for row:', row);
    
    if (!row.ID && !row.id && !row.Id && !row._id) {
      toast.error('Invalid record: Missing ID');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', evidenceFiles[rowIndex]);
      const recordId = (row.ID || row.id || row.Id || row._id).toString();
      formData.append('record_id', recordId);
      formData.append('audit_type', currentAuditTypeRef.current); // FIXED: Use ref

      console.log(`Uploading evidence for ${currentAuditTypeRef.current} audit, record ID: ${recordId}`);
      
      const response = await api.uploadEvidence(formData);
      console.log('Evidence upload response:', response);
      
      const updatedData = [...auditData];
      const dataIndex = auditData.findIndex(item => 
        (item.ID || item.id || item.Id || item._id) === (row.ID || row.id || row.Id || row._id)
      );
      
      if (dataIndex !== -1) {
        const today = new Date().toISOString().split('T')[0];
        updatedData[dataIndex] = {
          ...updatedData[dataIndex],
          Evidence: response.filename,
          Status: 'Closed',
          ClosingDates: today,
          DateOfSubmission: today
        };
        
        setAuditData(updatedData);
        applyFilters(searchTerm, isAdmin ? selectedPlant : userPlant, updatedData);
        
        setEvidenceFiles(prev => {
          const newState = {...prev};
          delete newState[rowIndex];
          return newState;
        });
        
        toast.success('Evidence uploaded successfully! Record closed automatically.');
      } else {
        toast.error('Record not found in data');
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      toast.error(err.message || 'Failed to upload evidence');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast.info(`File selected: ${selectedFile.name}`);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.warning('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', currentAuditTypeRef.current); // FIXED: Use ref
      
      console.log(`Uploading file for ${currentAuditTypeRef.current} audits`);
      
      setFile(null);
      setFileKey(Date.now());

      await api.uploadAuditFile(formData, currentAuditTypeRef.current);
      await loadData(currentAuditTypeRef.current);
      toast.success('File uploaded successfully!');
    } catch (err) {
      console.error('File upload error:', err);
      setError(err.message || 'Failed to upload file');
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellUpdate = async (rowIndex, columnName, value) => {
    const row = filteredData[rowIndex];
    const recordId = row.ID || row.id || row.Id || row._id;
    
    console.log(`Updating ${currentAuditTypeRef.current} audit record ${recordId}, field: ${columnName}, value: ${value}`);
    
    const updatedData = [...auditData];
    const dataIndex = auditData.findIndex(item => 
      (item.ID || item.id || item.Id || item._id) === recordId
    );
    
    if (dataIndex !== -1) {
      updatedData[dataIndex][columnName] = value;
      setAuditData(updatedData);

      try {
        await api.updateAuditRecord(currentAuditTypeRef.current, updatedData[dataIndex]);
        applyFilters(searchTerm, isAdmin ? selectedPlant : userPlant, updatedData);
        toast.success('Changes saved successfully');
      } catch (err) {
        console.error('Update error:', err);
        setError('Failed to save changes');
        toast.error('Failed to save changes');
      }
    }
  };

  const openEditPopup = (rowIndex, field) => {
    setEditPopup({
      isOpen: true,
      rowIndex,
      field,
      value: filteredData[rowIndex][field] || ''
    });
  };

  const closeEditPopup = () => {
    setEditPopup({
      isOpen: false,
      rowIndex: null,
      field: '',
      value: ''
    });
  };

  const saveEditPopup = () => {
    if (editPopup.rowIndex !== null) {
      handleCellUpdate(editPopup.rowIndex, editPopup.field, editPopup.value);
    }
    closeEditPopup();
  };

  // Update page title based on audit type
  useEffect(() => {
    document.title = auditType === 'external' ? 'External Audits - ISMS' : 'Internal Audits - ISMS';
  }, [auditType]);

  // Debug function to log current state
  const debugState = () => {
    console.log('Current audit type:', auditType);
    console.log('Ref audit type:', currentAuditTypeRef.current);
    console.log('Audit data length:', auditData.length);
    console.log('Filtered data length:', filteredData.length);
    console.log('Is admin:', isAdmin);
    console.log('User plant:', userPlant);
    console.log('Selected plant:', selectedPlant);
  };

  // Add refresh button handler
  const handleRefresh = () => {
    console.log('Refreshing data...');
    loadData();
  };

  return (
    <div className={styles.auditDashboard}>
      <Header />
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className={styles.auditContainer}>
        <div className={styles.auditContent}>
          {/* Updated Header to show current audit type */}
          <div className={styles.compactHeader}>
            <div className={styles.titleSection}>
              <h1>{auditType === 'external' ? 'EXTERNAL' : 'INTERNAL'} Audit Management</h1>
              {!isAdmin && userPlant && (
                <div className={styles.userPlantInfo}>
                  Showing data for: <strong>{userPlant}</strong>
                </div>
              )}
              <div className={styles.debugInfo}>
                <small>Data: {filteredData.length} records | Type: {auditType} | URL: {getAuditTypeFromURL()}</small>
              </div>
            </div>
            
            <div className={styles.controlsSection}>
              <div className={styles.searchBox}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search audits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {isAdmin && (
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
              
              <button 
                onClick={handleRefresh}
                className={styles.refreshButton}
                title="Refresh data"
              >
                <FiRefreshCw />
              </button>
              
              {isAdmin && (
                <div className={styles.uploadControl}>
                  <label className={styles.fileInputLabel}>
                    <input 
                      type="file" 
                      accept=".xlsx,.csv" 
                      onChange={handleFileChange} 
                      key={fileKey} 
                    />
                    <span className={styles.fileInputButton}>
                      <FiUpload /> Upload
                    </span>
                  </label>
                  <button 
                    onClick={handleFileUpload} 
                    disabled={!file || isLoading}
                    className={styles.uploadButton}
                  >
                    {isLoading ? (
                      <FiRefreshCw className={styles.spinIcon} />
                    ) : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
              <button onClick={() => setError(null)} className={styles.closeError}>
                <FiX />
              </button>
            </div>
          )}

          <div className={styles.tableWrapper}>
            {isLoading ? (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <p>Loading {auditType} audit data...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className={styles.noData}>
                <h3>No {auditType} audit data found</h3>
                <p>
                  {isAdmin 
                    ? `Try uploading a file or check if the ${auditType}_audits table exists in the database.`
                    : 'No data available for your plant or no records match your search.'
                  }
                </p>
                <button onClick={debugState} className={styles.debugButton}>
                  Debug Info
                </button>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.auditTable}>
                  <thead>
                  <tr>
                    <th>SN</th>
                    <th>Location</th>
                    <th>Domain/Clauses</th>
                    <th>Date of Audit</th>
                    <th>Report Date</th>
                    <th>NC Type</th>
                    <th>Observation</th>
                    <th>Root Cause Analysis</th>
                    <th>Corrective Action</th>
                    <th>Preventive Action</th>
                    <th>Department Name</th> 
                    <th>Closing Date</th>
                    <th>Status</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                  <tbody>
                    {filteredData.map((row, rowIndex) => (
                      <React.Fragment key={rowIndex}>
                        <tr>
                          <td className={styles.tableCell}>{row.SN}</td>
                          <td className={styles.tableCell}>{row.Location}</td>
                          <td className={styles.tableCell}>{row.DomainClauses}</td>
                          <td className={styles.tableCell}>{row.DateOfAudit}</td>
                          <td className={styles.tableCell}>{row.DateOfSubmission}</td>
                          <td className={styles.tableCell}>
                            <span className={`${styles.ncBadge} ${styles[row.NCMinI?.toLowerCase().replace(' ', '-')]}`}>
                              {row.NCMinI}
                            </span>
                          </td>
                          <td className={`${styles.tableCell} ${styles.observationCell}`}>
                            {row.ObservationDescription}
                          </td>
                          <td className={styles.tableCell}>
                            <div className={styles.editFieldContainer}>
                              <div className={styles.fieldContent}>
                                {row.RootCauseAnalysis }
                              </div>
                              <button 
                                className={styles.editButton}
                                onClick={() => openEditPopup(rowIndex, 'RootCauseAnalysis')}
                              >
                                <FiEdit2 /> Edit
                              </button>
                            </div>
                          </td>
                          <td className={styles.tableCell}>
                            <div className={styles.editFieldContainer}>
                              <div className={styles.fieldContent}>
                                {row.CorrectiveAction }
                              </div>
                              <button 
                                className={styles.editButton}
                                onClick={() => openEditPopup(rowIndex, 'CorrectiveAction')}
                              >
                                <FiEdit2 /> Edit
                              </button>
                            </div>
                          </td>
                          <td className={styles.tableCell}>
                            <div className={styles.editFieldContainer}>
                              <div className={styles.fieldContent}>
                                {row.PreventiveAction}
                              </div>
                              <button 
                                className={styles.editButton}
                                onClick={() => openEditPopup(rowIndex, 'PreventiveAction')}
                              >
                                <FiEdit2 /> Edit
                              </button>
                            </div>
                          </td>
                          <td className={styles.tableCell}>
                            {row.DepartmentName} {/* Display only, no edit controls */}
                          </td>
                          <td className={`${styles.tableCell} ${styles.editableCell}`}>
                            <input
                              type="date"
                              value={row.ClosingDates || ''}
                              onChange={(e) => handleCellUpdate(rowIndex, 'ClosingDates', e.target.value)}
                              className={styles.dateInput}
                            />
                          </td>
                          <td className={`${styles.tableCell} ${styles.editableCell}`}>
                            <select
                              value={row.Status || 'Open'}
                              onChange={(e) => handleCellUpdate(rowIndex, 'Status', e.target.value)}
                              className={`${styles.statusSelect} ${styles[row.Status?.toLowerCase()]}`}
                              disabled={!isAdmin && row.Status === 'Closed'}
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td className={`${styles.tableCell} ${styles.evidenceCell}`}>
                            {row.Evidence ? (
                              <div className={styles.evidenceDownload}>
                                <a 
                                  href={`${api.baseUrl}/uploads/${row.Evidence}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={styles.downloadLink}
                                >
                                  <FiDownload /> Download
                                </a>
                                {isAdmin && (
                                  <button 
                                    className={styles.clearEvidence}
                                    onClick={() => handleCellUpdate(rowIndex, 'Evidence', '')}
                                  >
                                    <FiX />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className={styles.evidenceUpload}>
                                <input
                                  type="file"
                                  id={`evidence-${rowIndex}`}
                                  accept=".pdf,.pptx,.png,.jpeg,.jpg"
                                  onChange={(e) => handleEvidenceFileChange(e, rowIndex)}
                                  style={{ display: 'none' }}
                                />
                                <label htmlFor={`evidence-${rowIndex}`} className={styles.fileLabel}>
                                  <FiFile /> Choose File
                                </label>
                                {evidenceFiles[rowIndex] && (
                                  <button 
                                    className={styles.uploadButton}
                                    onClick={() => handleEvidenceUpload(rowIndex)}
                                    disabled={isLoading}
                                  >
                                    <FiUpload /> Upload
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
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
            <textarea
              value={editPopup.value}
              onChange={(e) => setEditPopup({...editPopup, value: e.target.value})}
              className={styles.popupTextarea}
              autoFocus
            />
            <div className={styles.popupButtons}>
              <button 
                className={styles.popupCancel}
                onClick={closeEditPopup}
              >
                Cancel
              </button>
              <button 
                className={styles.popupSave}
                onClick={saveEditPopup}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audits;