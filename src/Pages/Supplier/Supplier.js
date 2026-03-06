import React, { useState, useEffect } from 'react';
import Header from '../../components/Common/Header';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Rating,
  Alert,
  Snackbar,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  AvatarGroup,
  Tooltip,
  LinearProgress,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon
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
  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    plant_id: '',
    plant_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: '',
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

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || '',
        company_id: supplier.company_id || '',
        plant_id: supplier.plant_id || '',
        plant_name: supplier.plant_name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        category: supplier.category || '',
        status: supplier.status || 'Active',
        rating: supplier.rating || 0
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        company_id: '',
        plant_id: '',
        plant_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        status: 'Active',
        rating: 0
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

    // Update plant_name when plant_id changes
    if (name === 'plant_id') {
      const selectedPlant = plants.find(p => p.id === parseInt(value));
      setFormData(prev => ({ ...prev, plant_name: selectedPlant?.name || '' }));
    }
  };

  const handleSubmit = async () => {
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
        showSnackbar('Supplier deleted successfully');
        fetchData();
      } catch (error) {
        showSnackbar(error.message, 'error');
      }
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'name',
      headerName: 'Supplier Name',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          {params.value}
        </Box>
      )
    },
    {
      field: 'company_name',
      headerName: 'Company',
      width: 150
    },
    {
      field: 'plant_name',
      headerName: 'Plant',
      width: 150
    },
    {
      field: 'contact_person',
      headerName: 'Contact Person',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
          {params.value}
        </Box>
      )
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
          {params.value}
        </Box>
      )
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PhoneIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
          {params.value}
        </Box>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Critical' ? 'error' : 'default'}
        />
      )
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 120,
      renderCell: (params) => (
        <Rating value={params.value} readOnly size="small" />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Active' ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'next_audit_date',
      headerName: 'Next Audit',
      width: 120,
      type: 'date'
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
            disabled={user?.role !== 'Super Admin' && user?.role !== 'Admin'}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
            disabled={user?.role !== 'Super Admin'}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'error';
      case 'Under Review': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    
    <Box className={styles.supplierContainer}>
        <Header />
      <Box className={styles.header}>
        <Typography variant="h4" className={styles.title}>Supplier Management</Typography>
        {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            className={styles.addButton}
          >
            Add Supplier
          </Button>
        )}
      </Box>

      <Box className={styles.tabsContainer}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Suppliers List" />
          <Tab label="Performance" />
          <Tab label="Audit History" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Paper className={styles.tableContainer}>
          <DataGrid
            rows={suppliers}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            checkboxSelection={false}
            disableSelectionOnClick
            className={styles.dataGrid}
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
          <Grid item xs={12} md={6}>
            <Card className={styles.performanceCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom className={styles.cardTitle}>
                  Supplier Performance
                </Typography>
                <Box className={styles.performanceList}>
                  {suppliers.map((supplier) => (
                    <Box
                      key={supplier.id}
                      className={styles.performanceItem}
                    >
                      <Typography variant="body2" className={styles.supplierName}>{supplier.name}</Typography>
                      <Box className={styles.performanceActions}>
                        <Rating value={supplier.rating} readOnly size="small" />
                        <Chip
                          label={supplier.status}
                          size="small"
                          color={getStatusColor(supplier.status)}
                          className={styles.statusChip}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className={styles.distributionCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom className={styles.cardTitle}>
                  Category Distribution
                </Typography>
                <Box className={styles.distributionList}>
                  {['Critical', 'Strategic', 'Tactical', 'Operational'].map(cat => {
                    const count = suppliers.filter(s => s.category === cat).length;
                    const percentage = (count / suppliers.length * 100) || 0;
                    return (
                      <Box key={cat} className={styles.distributionItem}>
                        <Box className={styles.distributionHeader}>
                          <Typography variant="body2" className={styles.categoryName}>{cat}</Typography>
                          <Typography variant="body2" className={styles.categoryCount}>{count}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          className={styles.progressBar}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Paper className={styles.auditHistory}>
          <Typography variant="body1" color="text.secondary" align="center">
            Audit history will be displayed here
          </Typography>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle className={styles.dialogTitle}>
          {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <Grid container spacing={2} className={styles.formGrid}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Supplier Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                className={styles.formField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required className={styles.formField}>
                <InputLabel>Company</InputLabel>
                <Select
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleInputChange}
                  label="Company"
                >
                  {companies.map(company => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required className={styles.formField}>
                <InputLabel>Plant</InputLabel>
                <Select
                  name="plant_id"
                  value={formData.plant_id}
                  onChange={handleInputChange}
                  label="Plant"
                >
                  {plants
                    .filter(p => !formData.company_id || p.company_id === formData.company_id)
                    .map(plant => (
                      <MenuItem key={plant.id} value={plant.id}>
                        {plant.name}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="contact_person"
                label="Contact Person"
                value={formData.contact_person}
                onChange={handleInputChange}
                fullWidth
                required
                className={styles.formField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
                className={styles.formField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="phone"
                label="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                required
                className={styles.formField}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                className={styles.formField}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required className={styles.formField}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  label="Category"
                >
                  <MenuItem value="Critical">Critical</MenuItem>
                  <MenuItem value="Strategic">Strategic</MenuItem>
                  <MenuItem value="Tactical">Tactical</MenuItem>
                  <MenuItem value="Operational">Operational</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required className={styles.formField}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Under Review">Under Review</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography component="legend" className={styles.ratingLabel}>Rating</Typography>
              <Rating
                name="rating"
                value={formData.rating}
                onChange={(e, newValue) => {
                  setFormData(prev => ({ ...prev, rating: newValue }));
                }}
                className={styles.ratingField}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <Button onClick={handleCloseDialog} className={styles.cancelButton}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" className={styles.submitButton}>
            {editingSupplier ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Supplier;