import React, { useState, useEffect } from 'react';
import Header from '../../components/Common/Header';
import { ToastContainer, toast } from 'react-toastify';
import { FiSearch, FiFilter, FiRefreshCw, FiX } from 'react-icons/fi';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  Rating,
  Tooltip,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  WarningAmber as WarningAmberIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RiskManagement.module.css';

const RiskManagement = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);
  const [riskMatrix, setRiskMatrix] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    plant_name: '',
    department: '',
    process_area: '',
    risk_description: '',
    risk_category: '',
    likelihood: 1,
    impact: 1,
    existing_controls: '',
    control_effectiveness: 3,
    residual_risk: '',
    treatment_plan: '',
    responsible_person: '',
    review_date: '',
    status: 'Open',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [risksData, departmentsData, plantsData, matrixData] = await Promise.all([
        api.getRiskAssessments(),
        api.getDepartments(),
        api.getPlants(),
        api.getRiskMatrix()
      ]);
      setRisks(risksData);
      setDepartments(departmentsData);
      setPlants(plantsData);
      setRiskMatrix(matrixData);
    } catch (error) {
      showSnackbar('Error fetching data', 'error');
    }
    setLoading(false);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (risk = null) => {
    if (risk) {
      setEditingRisk(risk);
      setFormData({
        plant_name: risk.plant_name || '',
        department: risk.department || '',
        process_area: risk.process_area || '',
        risk_description: risk.risk_description || '',
        risk_category: risk.risk_category || '',
        likelihood: risk.likelihood || 1,
        impact: risk.impact || 1,
        existing_controls: risk.existing_controls || '',
        control_effectiveness: risk.control_effectiveness || 3,
        residual_risk: risk.residual_risk || '',
        treatment_plan: risk.treatment_plan || '',
        responsible_person: risk.responsible_person || '',
        review_date: risk.review_date || '',
        status: risk.status || 'Open',
        notes: risk.notes || ''
      });
    } else {
      setEditingRisk(null);
      setFormData({
        plant_name: '',
        department: '',
        process_area: '',
        risk_description: '',
        risk_category: '',
        likelihood: 1,
        impact: 1,
        existing_controls: '',
        control_effectiveness: 3,
        residual_risk: '',
        treatment_plan: '',
        responsible_person: '',
        review_date: '',
        status: 'Open',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRisk(null);
  };

  const handleOpenDeleteDialog = (risk) => {
    setRiskToDelete(risk);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRiskToDelete(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingRisk) {
        await api.updateRiskAssessment(editingRisk.id, formData);
        showSnackbar('Risk assessment updated successfully');
      } else {
        await api.createRiskAssessment(formData);
        showSnackbar('Risk assessment created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      showSnackbar(error.message || 'Error saving risk assessment', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteRiskAssessment(riskToDelete.id);
      showSnackbar('Risk assessment deleted successfully');
      handleCloseDeleteDialog();
      fetchData();
    } catch (error) {
      showSnackbar(error.message || 'Error deleting risk assessment', 'error');
    }
  };

  const getRiskLevel = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 15) return 'High';
    if (score >= 8) return 'Medium';
    return 'Low';
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'High': return <ErrorIcon color="error" />;
      case 'Medium': return <WarningAmberIcon color="warning" />;
      case 'Low': return <InfoIcon color="info" />;
      default: return <AssessmentIcon />;
    }
  };

  const filteredRisks = risks.filter(risk => {
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || risk.department === filterDepartment;
    const matchesSearch = searchTerm === '' || 
      risk.risk_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.risk_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.process_area?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesDepartment && matchesSearch;
  });

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'risk_id',
      headerName: 'Risk ID',
      width: 120,
      renderCell: (params) => {
        const level = getRiskLevel(params.row.likelihood, params.row.impact);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getRiskIcon(level)}
            <Typography variant="body2" sx={{ ml: 1 }}>
              {params.value || `RISK-${params.row.id}`}
            </Typography>
          </Box>
        );
      }
    },
    { field: 'plant_name', headerName: 'Plant', width: 120 },
    { field: 'department', headerName: 'Department', width: 130 },
    { field: 'process_area', headerName: 'Process Area', width: 130 },
    {
      field: 'risk_description',
      headerName: 'Risk Description',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    { field: 'risk_category', headerName: 'Category', width: 120 },
    {
      field: 'likelihood',
      headerName: 'L',
      width: 50,
      type: 'number'
    },
    {
      field: 'impact',
      headerName: 'I',
      width: 50,
      type: 'number'
    },
    {
      field: 'risk_score',
      headerName: 'Score',
      width: 70,
      type: 'number',
      valueGetter: (params) => params.row.likelihood * params.row.impact
    },
    {
      field: 'risk_level',
      headerName: 'Level',
      width: 100,
      valueGetter: (params) => getRiskLevel(params.row.likelihood, params.row.impact),
      renderCell: (params) => {
        const level = getRiskLevel(params.row.likelihood, params.row.impact);
        return (
          <Chip
            label={level}
            size="small"
            color={getRiskLevelColor(level)}
          />
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Open' ? 'error' : params.value === 'In Progress' ? 'warning' : 'success'}
        />
      )
    },
    { field: 'responsible_person', headerName: 'Responsible', width: 130 },
    { 
      field: 'review_date', 
      headerName: 'Review Date', 
      width: 110,
      valueGetter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'Not set'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            disabled={user?.role !== 'Super Admin' && user?.role !== 'Admin' && user?.role !== 'Risk Manager'}
            title="Edit"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleOpenDeleteDialog(params.row)}
            disabled={user?.role !== 'Super Admin'}
            title="Delete"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  const getRiskDistributionByLevel = () => {
    const distribution = {
      High: filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'High').length,
      Medium: filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Medium').length,
      Low: filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Low').length
    };
    return [
      { name: 'High', value: distribution.High, color: '#f44336' },
      { name: 'Medium', value: distribution.Medium, color: '#ff9800' },
      { name: 'Low', value: distribution.Low, color: '#4caf50' }
    ];
  };

  const getRiskByCategory = () => {
    const categories = {};
    filteredRisks.forEach(risk => {
      if (risk.risk_category) {
        categories[risk.risk_category] = (categories[risk.risk_category] || 0) + 1;
      }
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  const getRiskByDepartment = () => {
    const deptRisks = {};
    filteredRisks.forEach(risk => {
      if (risk.department) {
        deptRisks[risk.department] = (deptRisks[risk.department] || 0) + 1;
      }
    });
    return Object.entries(deptRisks).map(([name, value]) => ({ name, value }));
  };

  const getRiskTrendData = () => {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const risksInMonth = filteredRisks.filter(risk => {
        const riskDate = risk.created_at ? new Date(risk.created_at) : null;
        return riskDate && riskDate.getMonth() === date.getMonth() && 
               riskDate.getFullYear() === date.getFullYear();
      });
      
      const highCount = risksInMonth.filter(r => getRiskLevel(r.likelihood, r.impact) === 'High').length;
      const mediumCount = risksInMonth.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Medium').length;
      const lowCount = risksInMonth.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Low').length;
      
      last6Months.push({
        month: monthName,
        High: highCount,
        Medium: mediumCount,
        Low: lowCount,
        Total: risksInMonth.length
      });
    }
    
    return last6Months;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
  <div className={styles.riskDashboard}>
    <Header />
    <ToastContainer position="top-right" autoClose={5000} />
    
    <div className={styles.riskContainer}>
      <div className={styles.riskContent}>
        {/* Header section with title and controls */}
        <div className={styles.compactHeader}>
          <div className={styles.titleSection}>
            <h1>Risk Management</h1>
            {user?.role !== 'Super Admin' && user?.PlantName && (
              <div className={styles.userPlantInfo}>
                Showing data for: <strong>{user.PlantName}</strong>
              </div>
            )}
            <div className={styles.debugInfo}>
              <small>Total Risks: {filteredRisks.length} | Status: {filterStatus} | Department: {filterDepartment}</small>
            </div>
          </div>
          
          <div className={styles.controlsSection}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search risks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className={styles.filterDropdown}>
              <FiFilter className={styles.filterIcon} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            
            <div className={styles.filterDropdown}>
              <FiFilter className={styles.filterIcon} />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={fetchData}
              className={styles.refreshButton}
              title="Refresh data"
            >
              <FiRefreshCw />
            </button>
            
            {(user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Risk Manager') && (
              <div className={styles.uploadControl}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0'
                    }
                  }}
                >
                  New Risk Assessment
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
            <button onClick={() => setError(null)} className={styles.closeError}>
              <FiX />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} className={styles.summaryCards}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className={styles.summaryCard}>
              <CardContent>
                <Box className={styles.cardContent}>
                  <ErrorIcon color="error" className={styles.cardIcon} />
                  <Box>
                    <Typography variant="h4" className={styles.cardValue}>
                      {filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'High').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      High Risks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className={styles.summaryCard}>
              <CardContent>
                <Box className={styles.cardContent}>
                  <WarningAmberIcon color="warning" className={styles.cardIcon} />
                  <Box>
                    <Typography variant="h4" className={styles.cardValue}>
                      {filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Medium').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Medium Risks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className={styles.summaryCard}>
              <CardContent>
                <Box className={styles.cardContent}>
                  <InfoIcon color="info" className={styles.cardIcon} />
                  <Box>
                    <Typography variant="h4" className={styles.cardValue}>
                      {filteredRisks.filter(r => getRiskLevel(r.likelihood, r.impact) === 'Low').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Low Risks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className={styles.summaryCard}>
              <CardContent>
                <Box className={styles.cardContent}>
                  <CheckCircleIcon color="success" className={styles.cardIcon} />
                  <Box>
                    <Typography variant="h4" className={styles.cardValue}>
                      {filteredRisks.filter(r => r.status === 'Closed').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Closed Risks
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Paper - Keeping MUI for advanced filters */}
        <Paper className={styles.filters}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search risks"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description, ID, or area..."
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => {
                  setFilterStatus('all');
                  setFilterDepartment('all');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Paper className={styles.tabs}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Risk Register" />
            <Tab label="Risk Matrix" />
            <Tab label="Analytics" />
            <Tab label="Heat Map" />
          </Tabs>
        </Paper>

        {/* Loading State */}
        {loading ? (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Loading risk management data...</p>
          </div>
        ) : (
          <>
            {/* Tab Panels */}
            {tabValue === 0 && (
              <Paper className={styles.dataGrid}>
                <DataGrid
                  rows={filteredRisks}
                  columns={columns}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  checkboxSelection={false}
                  disableSelectionOnClick
                  autoHeight
                  sx={{
                    '& .MuiDataGrid-cell:focus': {
                      outline: 'none'
                    }
                  }}
                />
              </Paper>
            )}

            {tabValue === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Paper className={styles.matrixPaper}>
                    <Typography variant="h6" gutterBottom>
                      5x5 Risk Matrix
                    </Typography>
                    <Box className={styles.matrixContainer}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Likelihood \ Impact</TableCell>
                              <TableCell align="center">1 (Very Low)</TableCell>
                              <TableCell align="center">2 (Low)</TableCell>
                              <TableCell align="center">3 (Medium)</TableCell>
                              <TableCell align="center">4 (High)</TableCell>
                              <TableCell align="center">5 (Very High)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[5, 4, 3, 2, 1].map(likelihood => (
                              <TableRow key={likelihood}>
                                <TableCell component="th" scope="row">
                                  {likelihood} {likelihood === 5 ? '(Very High)' : likelihood === 1 ? '(Very Low)' : ''}
                                </TableCell>
                                {[1, 2, 3, 4, 5].map(impact => {
                                  const count = riskMatrix[likelihood - 1]?.[impact - 1] || 
                                    filteredRisks.filter(r => r.likelihood === likelihood && r.impact === impact).length;
                                  const riskScore = likelihood * impact;
                                  let bgColor = '#4caf50';
                                  if (riskScore >= 15) bgColor = '#f44336';
                                  else if (riskScore >= 8) bgColor = '#ff9800';
                                  
                                  return (
                                    <TableCell
                                      key={impact}
                                      align="center"
                                      className={styles.matrixCell}
                                      sx={{
                                        bgcolor: bgColor,
                                        color: 'white',
                                        fontWeight: 'bold',
                                        opacity: count > 0 ? 1 : 0.3
                                      }}
                                    >
                                      {count > 0 ? count : '-'}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper className={styles.legendPaper}>
                    <Typography variant="h6" gutterBottom>
                      Risk Level Legend
                    </Typography>
                    <Box className={styles.legend}>
                      <Box className={styles.legendItem}>
                        <Box className={styles.legendColor} sx={{ bgcolor: '#f44336' }} />
                        <Typography>High Risk (15-25)</Typography>
                      </Box>
                      <Box className={styles.legendItem}>
                        <Box className={styles.legendColor} sx={{ bgcolor: '#ff9800' }} />
                        <Typography>Medium Risk (8-14)</Typography>
                      </Box>
                      <Box className={styles.legendItem}>
                        <Box className={styles.legendColor} sx={{ bgcolor: '#4caf50' }} />
                        <Typography>Low Risk (1-7)</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Risk Score Calculation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Risk Score = Likelihood × Impact
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      • High: 15-25 (Immediate action required)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Medium: 8-14 (Action plan required)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Low: 1-7 (Monitor regularly)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {tabValue === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper className={styles.chartPaper}>
                    <Typography variant="h6" gutterBottom>
                      Risk Distribution by Level
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getRiskDistributionByLevel()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getRiskDistributionByLevel().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper className={styles.chartPaper}>
                    <Typography variant="h6" gutterBottom>
                      Risks by Category
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getRiskByCategory()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper className={styles.chartPaper}>
                    <Typography variant="h6" gutterBottom>
                      Risks by Department
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getRiskByDepartment()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper className={styles.chartPaper}>
                    <Typography variant="h6" gutterBottom>
                      Risk Trend (Last 6 Months)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getRiskTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="High" stroke="#f44336" />
                        <Line type="monotone" dataKey="Medium" stroke="#ff9800" />
                        <Line type="monotone" dataKey="Low" stroke="#4caf50" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {tabValue === 3 && (
              <Paper className={styles.heatMap}>
                <Typography variant="h6" gutterBottom>
                  Risk Heat Map by Department and Category
                </Typography>
                <Box className={styles.heatMapContainer}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Department / Category</TableCell>
                          {['Operational', 'Financial', 'Strategic', 'Compliance', 'Reputational'].map(cat => (
                            <TableCell key={cat} align="center">{cat}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {departments.map(dept => (
                          <TableRow key={dept.id}>
                            <TableCell component="th" scope="row">
                              {dept.name}
                            </TableCell>
                            {['Operational', 'Financial', 'Strategic', 'Compliance', 'Reputational'].map(cat => {
                              const deptRisks = filteredRisks.filter(
                                r => r.department === dept.name && r.risk_category === cat
                              );
                              const avgRisk = deptRisks.reduce((sum, r) => sum + (r.likelihood * r.impact || 0), 0);
                              const score = deptRisks.length > 0 ? avgRisk / deptRisks.length : 0;
                              
                              let bgColor = '#4caf50';
                              if (score >= 15) bgColor = '#f44336';
                              else if (score >= 8) bgColor = '#ff9800';
                              
                              return (
                                <TableCell
                                  key={cat}
                                  align="center"
                                  className={styles.heatMapCell}
                                  sx={{
                                    bgcolor: bgColor,
                                    color: 'white',
                                    fontWeight: 'bold',
                                    opacity: deptRisks.length > 0 ? 1 : 0.1
                                  }}
                                >
                                  <Tooltip title={`Average Risk Score: ${score.toFixed(1)}`}>
                                    <span>{deptRisks.length}</span>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* Risk Assessment Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingRisk ? 'Edit Risk Assessment' : 'New Risk Assessment'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Plant</InputLabel>
                  <Select
                    name="plant_name"
                    value={formData.plant_name}
                    onChange={handleInputChange}
                    label="Plant"
                  >
                    {plants.map(plant => (
                      <MenuItem key={plant.id} value={plant.name}>
                        {plant.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    label="Department"
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="process_area"
                  label="Process Area"
                  value={formData.process_area}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="risk_description"
                  label="Risk Description"
                  value={formData.risk_description}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Risk Category</InputLabel>
                  <Select
                    name="risk_category"
                    value={formData.risk_category}
                    onChange={handleInputChange}
                    label="Risk Category"
                  >
                    <MenuItem value="Operational">Operational</MenuItem>
                    <MenuItem value="Financial">Financial</MenuItem>
                    <MenuItem value="Strategic">Strategic</MenuItem>
                    <MenuItem value="Compliance">Compliance</MenuItem>
                    <MenuItem value="Reputational">Reputational</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                  >
                    <MenuItem value="Open">Open</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Risk Assessment
                </Typography>
                <Divider />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Likelihood (1-5)</Typography>
                <Rating
                  name="likelihood"
                  value={formData.likelihood}
                  onChange={(e, newValue) => {
                    setFormData(prev => ({ ...prev, likelihood: newValue || 1 }));
                  }}
                  max={5}
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  1: Very Low, 5: Very High
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Impact (1-5)</Typography>
                <Rating
                  name="impact"
                  value={formData.impact}
                  onChange={(e, newValue) => {
                    setFormData(prev => ({ ...prev, impact: newValue || 1 }));
                  }}
                  max={5}
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  1: Very Low, 5: Very High
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">
                    Risk Score: {formData.likelihood * formData.impact} - 
                    Level: {
                      formData.likelihood * formData.impact >= 15 ? 'High' :
                      formData.likelihood * formData.impact >= 8 ? 'Medium' : 'Low'
                    }
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="existing_controls"
                  label="Existing Controls"
                  value={formData.existing_controls}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Control Effectiveness</InputLabel>
                  <Select
                    name="control_effectiveness"
                    value={formData.control_effectiveness}
                    onChange={handleInputChange}
                    label="Control Effectiveness"
                  >
                    <MenuItem value={1}>1 - Poor</MenuItem>
                    <MenuItem value={2}>2 - Fair</MenuItem>
                    <MenuItem value={3}>3 - Good</MenuItem>
                    <MenuItem value={4}>4 - Very Good</MenuItem>
                    <MenuItem value={5}>5 - Excellent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="residual_risk"
                  label="Residual Risk"
                  value={formData.residual_risk}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="treatment_plan"
                  label="Treatment Plan"
                  value={formData.treatment_plan}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="responsible_person"
                  label="Responsible Person"
                  value={formData.responsible_person}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="review_date"
                  label="Review Date"
                  type="date"
                  value={formData.review_date}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Additional Notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingRisk ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this risk assessment? This action cannot be undone.
            </Typography>
            {riskToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2">
                  Risk: {riskToDelete.risk_description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {riskToDelete.risk_id || `RISK-${riskToDelete.id}`}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  </div>
);
};

export default RiskManagement;