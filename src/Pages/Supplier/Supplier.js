import React, { useState, useEffect } from 'react';
import Header from '../../components/Common/Header';
import * as XLSX from 'xlsx';
import {
  Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, Chip,
  Rating, Alert, Snackbar, FormControl, InputLabel, Select, 
  LinearProgress, Tab, Tabs, Fade, Container,
  Avatar, Tooltip, Card, CardContent, Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon, 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Supplier.module.css';

const Supplier = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);

  const userRole = (user?.role || "").toString().toLowerCase().trim();
  const hasFullAccess = userRole === 'super admin' || userRole === 'isms admin';
  const canEdit = hasFullAccess || userRole.includes('admin');

  const [formData, setFormData] = useState({
    sap_id: '',
    name: '',
    company_id: '',
    plant_id: '',
    plant_name: '',
    contact_person: '',
    email: '',
    phone: '',
    category: 'Operational',
    sla_start_date: '',
    sla_end_date: '',
    nda_start_date: '',
    nda_end_date: '',
    status: 'Active',
    rating: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersData, companiesData, plantsData] = await Promise.all([
        api.getSuppliers(),
        api.getCompanies(),
        api.getPlants()
      ]);
      setSuppliers(suppliersData);
      setCompanies(companiesData);
      setPlants(plantsData);
    } catch (error) {
      showSnackbar('Error fetching data', 'error');
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: 'binary' }).Sheets[XLSX.read(evt.target.result, { type: 'binary' }).SheetNames[0]]);
        for (const row of data) {
          await api.createSupplier({
            sap_id: row['Sap ID'] || row['sap_id'] || '',
            name: row['Supplier Name'] || row['name'] || '',
            category: row['Category'] || 'Operational',
            contact_person: row['Contact Person'] || '',
            phone: row['Contact No'] || '',
            email: row['Mail ID'] || '',
            sla_start_date: row['SLA Start Date'] || '',
            sla_end_date: row['SLA End Date'] || '',
            nda_start_date: row['NDA Start Date'] || '',
            nda_end_date: row['NDA End Date'] || '',
          });
        }
        showSnackbar('Excel data imported successfully');
        fetchData();
      } catch (err) {
        showSnackbar('Error processing Excel file', 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const exportData = suppliers.map(s => ({
      'Sap ID': s.sap_id,
      'Supplier Name': s.name,
      'Plant': s.plant_name,
      'Contact Person': s.contact_person,
      'Contact No': s.phone,
      'Mail ID': s.email,
      'Category': s.category,
      'SLA Start Date': s.sla_start_date,
      'SLA End Date': s.sla_end_date,
      'NDA Start Date': s.nda_start_date,
      'NDA End Date': s.nda_end_date,
      'Rating': s.rating
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, `Supplier_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Export completed successfully');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ ...supplier });
    } else {
      setEditingSupplier(null);
      setFormData({
        sap_id: '', name: '', company_id: '', plant_id: '', plant_name: '',
        contact_person: '', email: '', phone: '', category: 'Operational',
        sla_start_date: '', sla_end_date: '', nda_start_date: '', nda_end_date: '',
        status: 'Active', rating: 0
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'plant_id') {
      const selectedPlant = plants.find(p => p.id === value);
      if (selectedPlant) setFormData(prev => ({ ...prev, plant_name: selectedPlant.name }));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.sap_id || !formData.plant_id) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, formData);
        showSnackbar('Supplier updated successfully');
      } else {
        await api.createSupplier(formData);
        showSnackbar('Supplier created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.deleteSupplier(id);
        showSnackbar('Deleted successfully');
        fetchData();
      } catch (error) {
        showSnackbar(error.message, 'error');
      }
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Critical': '#dc2626',
      'Strategic': '#f59e0b',
      'Tactical': '#3b82f6',
      'Operational': '#10b981'
    };
    return colors[category] || '#6b7280';
  };

  const columns = [
    { 
      field: 'sap_id', 
      headerName: 'SAP ID', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }}
        />
      )
    },
    { field: 'plant_name', headerName: 'Plant', width: 130 },
    { 
      field: 'name', 
      headerName: 'Supplier Name', 
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f46e5' }}>
            <BusinessIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography fontWeight={600}>{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: 'contact_person', 
      headerName: 'Contact Person', 
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ fontSize: 16, color: '#6b7280' }} />
          {params.value}
        </Box>
      )
    },
    { 
      field: 'category', 
      headerName: 'Category', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small"
          sx={{
            bgcolor: `${getCategoryColor(params.value)}20`,
            color: getCategoryColor(params.value),
            fontWeight: 600,
            border: `1px solid ${getCategoryColor(params.value)}40`
          }}
        />
      )
    },
    { 
      field: 'phone', 
      headerName: 'Contact No', 
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon sx={{ fontSize: 16, color: '#6b7280' }} />
          {params.value}
        </Box>
      )
    },
    { 
      field: 'email', 
      headerName: 'Mail ID', 
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon sx={{ fontSize: 16, color: '#6b7280' }} />
            <Typography variant="body2" noWrap>{params.value}</Typography>
          </Box>
        </Tooltip>
      )
    },
    { 
      field: 'sla_start_date', 
      headerName: 'SLA Start', 
      width: 110,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarIcon sx={{ fontSize: 14, color: '#6b7280' }} />
          {params.value}
        </Box>
      )
    },
    { field: 'sla_end_date', headerName: 'SLA End', width: 110 },
    { field: 'nda_start_date', headerName: 'NDA Start', width: 110 },
    { field: 'nda_end_date', headerName: 'NDA End', width: 110 },
    {
      field: 'rating',
      headerName: 'Ratings',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating value={Number(params.value) || 0} readOnly size="small" precision={0.5} />
          <Typography variant="caption" color="textSecondary">({params.value})</Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 100,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpenDialog(p.row)} disabled={!canEdit} sx={{ color: '#4f46e5' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)} disabled={!hasFullAccess}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  if (loading) return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <LinearProgress sx={{ bgcolor: '#e0e7ff', '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' } }} />
    </Box>
  );

  return (
    <Box className={styles.supplierContainer}>
      <Header />
      
      <Container maxWidth="xl" className={styles.contentWrapper}>
        {/* Header Section */}
        <Box className={styles.headerSection}>
          <Box className={styles.titleSection}>
            <Typography variant="h4" className={styles.mainTitle}>
              Supplier Management
            </Typography>
            <Typography variant="body2" className={styles.subTitle}>
              Manage all your supplier information, contracts, and performance metrics
            </Typography>
          </Box>
          
          <Box className={styles.actionButtons}>
            {hasFullAccess && (
              <>
                <Button 
                  component="label" 
                  variant="outlined" 
                  startIcon={<CloudUploadIcon />} 
                  className={styles.importBtn}
                >
                  Import Excel
                  <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
                </Button>

                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => handleOpenDialog()} 
                  className={styles.addBtn}
                >
                  Add Supplier
                </Button>
              </>
            )}
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />} 
              onClick={handleExport}
              className={styles.exportBtn}
            >
              Export Report
            </Button>
          </Box>
        </Box>

        {/* Tabs Section */}
        <Box className={styles.tabsSection}>
          <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)} 
            className={styles.tabs}
            TabIndicatorProps={{ sx: { bgcolor: '#4f46e5', height: 3 } }}
          >
            <Tab label="Suppliers List" className={styles.tab} />
            <Tab label="Performance Dashboard" className={styles.tab} />
          </Tabs>
        </Box>

        {/* Suppliers Table */}
        {tabValue === 0 && (
          <Paper className={styles.tableWrapper}>
            <DataGrid 
              rows={suppliers} 
              columns={columns} 
              pageSize={10} 
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick 
              getRowId={(row) => row.id}
              className={styles.dataGrid}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f8fafc',
                  color: '#1e293b',
                  fontWeight: 700,
                  fontSize: '13px'
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: '#f1f5f9'
                },
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none'
                }
              }}
            />
          </Paper>
        )}

        {/* Performance Dashboard */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card className={styles.performanceCard}>
                <CardContent>
                  <Typography variant="h6" className={styles.cardTitle}>
                    <AssessmentIcon sx={{ mr: 1 }} />
                    Supplier Performance Overview
                  </Typography>
                  <Box className={styles.performanceList}>
                    {suppliers.slice(0, 10).map((supplier) => (
                      <Box key={supplier.id} className={styles.performanceItem}>
                        <Box className={styles.supplierInfo}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: getCategoryColor(supplier.category) }}>
                            <BusinessIcon />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{supplier.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {supplier.category} • {supplier.plant_name}
                            </Typography>
                          </Box>
                        </Box>
                        <Box className={styles.performanceMetrics}>
                          <Rating value={Number(supplier.rating) || 0} readOnly size="small" precision={0.5} />
                          <Chip 
                            label={supplier.status} 
                            size="small"
                            sx={{ bgcolor: supplier.status === 'Active' ? '#10b98120' : '#ef444420', color: supplier.status === 'Active' ? '#10b981' : '#ef4444' }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card className={styles.statsCard}>
                <CardContent>
                  <Typography variant="h6" className={styles.cardTitle}>
                    Category Distribution
                  </Typography>
                  {['Critical', 'Strategic', 'Tactical', 'Operational'].map(cat => {
                    const count = suppliers.filter(s => s.category === cat).length;
                    const percentage = (count / suppliers.length * 100) || 0;
                    return (
                      <Box key={cat} className={styles.distributionItem}>
                        <Box className={styles.distributionHeader}>
                          <Typography variant="body2" fontWeight={500}>{cat}</Typography>
                          <Typography variant="body2" color="textSecondary">{count} suppliers</Typography>
                        </Box>
                        <Box className={styles.progressBarContainer}>
                          <Box 
                            className={styles.progressBar} 
                            sx={{ 
                              width: `${percentage}%`,
                              bgcolor: getCategoryColor(cat)
                            }} 
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className={styles.statsCard} sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" className={styles.cardTitle}>
                    Quick Stats
                  </Typography>
                  <Box className={styles.statItem}>
                    <Typography variant="body2" color="textSecondary">Total Suppliers</Typography>
                    <Typography variant="h4" fontWeight={700} color="#4f46e5">{suppliers.length}</Typography>
                  </Box>
                  <Box className={styles.statItem}>
                    <Typography variant="body2" color="textSecondary">Active Suppliers</Typography>
                    <Typography variant="h4" fontWeight={700} color="#10b981">{suppliers.filter(s => s.status === 'Active').length}</Typography>
                  </Box>
                  <Box className={styles.statItem}>
                    <Typography variant="body2" color="textSecondary">Average Rating</Typography>
                    <Typography variant="h4" fontWeight={700} color="#f59e0b">
                      {(suppliers.reduce((acc, s) => acc + (Number(s.rating) || 0), 0) / suppliers.length || 0).toFixed(1)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Single Vertical Form Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
          TransitionComponent={Fade}
          PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', maxHeight: '90vh' } }}
        >
          <DialogTitle className={styles.modalHeader}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h5" fontWeight="800" color="#1e293b">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  Fill in the supplier details below
                </Typography>
              </Box>
              <IconButton onClick={handleCloseDialog} sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
              {/* Basic Information Section */}
              <Box className={styles.formSection}>
                <Box className={styles.sectionHeader}>
                  <BusinessIcon sx={{ color: '#4f46e5' }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    Basic Information
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      name="sap_id" 
                      label="SAP ID" 
                      fullWidth 
                      required
                      value={formData.sap_id} 
                      onChange={handleInputChange} 
                      variant="outlined"
                      size="small"
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      name="name" 
                      label="Supplier Name" 
                      fullWidth 
                      required
                      value={formData.name} 
                      onChange={handleInputChange} 
                      variant="outlined"
                      size="small"
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={18} md={8}>
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel>Plant</InputLabel>
                      <Select 
                        name="plant_id" 
                        value={formData.plant_id || ''} 
                        onChange={handleInputChange} 
                        label="Plant"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">Select Plant</MenuItem>
                        {plants.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel>Category</InputLabel>
                      <Select 
                        name="category" 
                        value={formData.category} 
                        onChange={handleInputChange} 
                        label="Category"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="Critical">Critical</MenuItem>
                        <MenuItem value="Strategic">Strategic</MenuItem>
                        <MenuItem value="Tactical">Tactical</MenuItem>
                        <MenuItem value="Operational">Operational</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Contact Information Section */}
              <Box className={styles.formSection} sx={{ mt: 4 }}>
                <Box className={styles.sectionHeader}>
                  <PersonIcon sx={{ color: '#4f46e5' }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    Contact Information
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      name="contact_person" 
                      label="Contact Person" 
                      fullWidth 
                      value={formData.contact_person} 
                      onChange={handleInputChange} 
                      variant="outlined"
                      size="small"
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      name="phone" 
                      label="Contact Number" 
                      fullWidth 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      variant="outlined"
                      size="small"
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      name="email" 
                      label="Email Address" 
                      type="email"
                      fullWidth 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      variant="outlined"
                      size="small"
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Compliance & Agreements Section */}
              <Box className={styles.formSection} sx={{ mt: 4 }}>
                <Box className={styles.sectionHeader}>
                  <CalendarIcon sx={{ color: '#4f46e5' }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    Compliance & Agreements
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      type="date" 
                      name="sla_start_date" 
                      label="SLA Start Date" 
                      fullWidth 
                      InputLabelProps={{ shrink: true }} 
                      value={formData.sla_start_date} 
                      onChange={handleInputChange}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      type="date" 
                      name="sla_end_date" 
                      label="SLA End Date" 
                      fullWidth 
                      InputLabelProps={{ shrink: true }} 
                      value={formData.sla_end_date} 
                      onChange={handleInputChange}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      type="date" 
                      name="nda_start_date" 
                      label="NDA Start Date" 
                      fullWidth 
                      InputLabelProps={{ shrink: true }} 
                      value={formData.nda_start_date} 
                      onChange={handleInputChange}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      type="date" 
                      name="nda_end_date" 
                      label="NDA End Date" 
                      fullWidth 
                      InputLabelProps={{ shrink: true }} 
                      value={formData.nda_end_date} 
                      onChange={handleInputChange}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Rating Section */}
              <Box className={styles.formSection} sx={{ mt: 4 }}>
                <Box className={styles.sectionHeader}>
                  <StarIcon sx={{ color: '#4f46e5' }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    Supplier Rating
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Rating 
                    value={Number(formData.rating)} 
                    onChange={(e, val) => setFormData({...formData, rating: val})} 
                    size="large" 
                    precision={0.5}
                    icon={<StarIcon fontSize="inherit" />}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Click to rate the supplier (0 to 5 stars)
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button 
              onClick={handleCloseDialog} 
              startIcon={<CancelIcon />}
              sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit} 
              startIcon={<SaveIcon />}
              sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 2, px: 4 }}
            >
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Supplier;
