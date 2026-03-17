import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './Userrole.module.css';
import Header from '../../components/Common/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiUserPlus, FiUsers, FiEdit2, FiTrash2, FiKey, FiMail, FiBriefcase, FiHome, FiX, FiPlus, FiSettings } from 'react-icons/fi';
import { motion } from 'framer-motion';

const UserRole = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    plantName: '',
    username: '',
    genId: '',
    password: '',
    email: '',
    department: '',
    role: 'user'
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showManageOptionsModal, setShowManageOptionsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('companies');
  const [plantOptions, setPlantOptions] = useState([]);
  
  // Dynamic options from backend
  const [companyOptions, setCompanyOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [allPlants, setAllPlants] = useState([]);
  
  // Manage options form data
  const [manageFormData, setManageFormData] = useState({
    companyName: '',
    plantName: '',
    companyId: '',
    departmentName: ''
  });
  const [editingItem, setEditingItem] = useState(null);

  const navigate = useNavigate();

  const roleOptions = [
    'Super Admin',
    'ISMS Admin', 
    'ISC Admin',
    'Process Owner',
    'Subordinate',
    'Auditor',
    'Management Role'
  ];

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          navigate('/login');
          return;
        }

        const user = JSON.parse(userStr);
        if (user?.role !== 'Super Admin') {
          navigate('/dashboard');
          return;
        }

        setUser(user);
        setIsAdmin(true);
        await loadUsers();
        await loadDynamicOptions();
      } catch (err) {
        console.error('Error:', err);
        navigate('/login');
      }
    };

    checkUser();
  }, [navigate]);

  // Load dynamic options from backend
  const loadDynamicOptions = async () => {
    try {
      const [companies, plants, departments] = await Promise.all([
        api.getCompanies(),
        api.getPlants(),
        api.getDepartments()
      ]);
      
      setCompanyOptions(companies);
      setAllPlants(plants);
      setDepartmentOptions(departments);
    } catch (err) {
      console.error('Failed to load dynamic options:', err);
      toast.error('Failed to load options');
    }
  };

  // Update plant options when company changes
  useEffect(() => {
    if (formData.companyName) {
      const filteredPlants = allPlants
        .filter(plant => plant.company_name === formData.companyName)
        .map(plant => plant.name);
      setPlantOptions(filteredPlants);
      
      // Reset plant name when company changes
      setFormData(prev => ({
        ...prev,
        plantName: ''
      }));
    } else {
      setPlantOptions([]);
    }
  }, [formData.companyName, allPlants]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await api.getAllUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      setError('Failed to load users. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      companyName: user.CompanyName,
      plantName: user.PlantName || '',
      username: user.Username,
      genId: user.GenId || '',
      password: '',
      email: user.Email,
      department: user.Department,
      role: user.Role
    });
    setEditingUserId(user.id);
    setShowCreateUserModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleManageInputChange = (e) => {
    const { name, value } = e.target;
    setManageFormData({
      ...manageFormData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // NEW: Password Validation Regex
    // Requires: 1 letter, 1 number, 1 special character, min 8 chars
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    
    if ((!editingUserId || formData.password) && !passwordRegex.test(formData.password)) {
      toast.error('Password must be at least 8 characters long and contain letters, numbers, and a special character.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (editingUserId) {
        await api.updateUser(editingUserId, formData);
        toast.success('User updated successfully!');
      } else {
        await api.createUser(formData);
        toast.success('User created successfully!');
      }
      
      await loadUsers();
      resetForm();
      setShowCreateUserModal(false);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      plantName: '',
      username: '',
      genId: '',
      password: '',
      email: '',
      department: '',
      role: 'user'
    });
    setEditingUserId(null);
    setPlantOptions([]);
  };

  const resetManageForm = () => {
    setManageFormData({
      companyName: '',
      plantName: '',
      companyId: '',
      departmentName: ''
    });
    setEditingItem(null);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(userId);
        await loadUsers();
        toast.success('User deleted successfully');
      } catch (err) {
        toast.error('Failed to delete user');
      }
    }
  };

  // Manage Options Functions
  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      await api.addCompany(manageFormData.companyName);
      toast.success('Company added successfully!');
      resetManageForm();
      await loadDynamicOptions();
    } catch (err) {
      toast.error(err.message || 'Failed to add company');
    }
  };

  const handleAddPlant = async (e) => {
    e.preventDefault();
    try {
      await api.addPlant(manageFormData.plantName, manageFormData.companyId);
      toast.success('Plant added successfully!');
      resetManageForm();
      await loadDynamicOptions();
    } catch (err) {
      toast.error(err.message || 'Failed to add plant');
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.addDepartment(manageFormData.departmentName);
      toast.success('Department added successfully!');
      resetManageForm();
      await loadDynamicOptions();
    } catch (err) {
      toast.error(err.message || 'Failed to add department');
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await api.deleteCompany(companyId);
        toast.success('Company deleted successfully!');
        await loadDynamicOptions();
      } catch (err) {
        toast.error(err.message || 'Failed to delete company');
      }
    }
  };

  const handleDeletePlant = async (plantId) => {
    if (window.confirm('Are you sure you want to delete this plant?')) {
      try {
        await api.deletePlant(plantId);
        toast.success('Plant deleted successfully!');
        await loadDynamicOptions();
      } catch (err) {
        toast.error(err.message || 'Failed to delete plant');
      }
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await api.deleteDepartment(departmentId);
        toast.success('Department deleted successfully!');
        await loadDynamicOptions();
      } catch (err) {
        toast.error(err.message || 'Failed to delete department');
      }
    }
  };

  const filteredUsers = users.filter(user => 
    Object.values(user).some(
      val => val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (!isAdmin) return null;

  return (
    <div className={styles.adminDashboard}>
      <Header 
        userRole={user.role} 
        userName={user.username} 
        userDepartment={user.department} 
        userID={user.UserID}
      />
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className={styles.adminContainer}>

        <div className={styles.adminContent}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={styles.adminHeader}
          >
            <div className={styles.headerRow}>
              <div>
                <h2>User Management</h2>
                <p>Admin dashboard for managing system users and permissions</p>
              </div>
              <div className={styles.headerButtons}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={styles.manageOptionsButton}
                  onClick={() => setShowManageOptionsModal(true)}
                >
                  <FiSettings className={styles.buttonIcon} />
                  Manage Options
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={styles.createUserButton}
                  onClick={() => {
                    resetForm();
                    setShowCreateUserModal(true);
                  }}
                >
                  <FiPlus className={styles.buttonIcon} />
                  Create User
                </motion.button>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={styles.userListContainer}
          >
            <div className={styles.listControls}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className={styles.searchIcon}>🔍</span>
              </div>
              <div className={styles.userCount}>
                Total Users: {filteredUsers.length}
              </div>
            </div>
            
            <div className={styles.tableResponsive}>
              {isLoading ? (
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner}></div>
                  <p>Loading users...</p>
                </div>
              ) : (
                <table className={styles.usersTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Company</th>
                      <th>Plant</th>
                      <th>Username</th>
                      <th>GEN ID</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.CompanyName}</td>
                        <td>{user.PlantName}</td>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.userAvatar}>
                              {user.Username?.charAt(0).toUpperCase()}
                            </div>
                            {user.Username}
                          </div>
                        </td>
                        <td>{user.GenId}</td>
                        <td>{user.Email}</td>
                        <td>{user.Department}</td>
                        <td>
                          <span className={`${styles.roleBadge} ${styles[user.Role.toLowerCase().replace(' ', '_')]}`}>
                            {user.Role}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button 
                              className={styles.editButton}
                              onClick={() => handleEdit(user)}
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              className={styles.deleteButton}
                              onClick={() => handleDelete(user.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.modalOverlay}
          onClick={() => {
            setShowCreateUserModal(false);
            resetForm();
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <FiUserPlus className={styles.modalIcon} />
                <h3>{editingUserId ? 'Edit User' : 'Create New User'}</h3>
              </div>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setShowCreateUserModal(false);
                  resetForm();
                }}
              >
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.elegantForm}>
              <div className={styles.formGrid}>
                {/* Company Name Dropdown */}
                <div className={styles.formGroup}>
                  <label>
                    <FiHome className={styles.inputIcon} />
                    Company Name
                  </label>
                  <select
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    className={styles.plantSelect}
                  >
                    <option value="">Select Company</option>
                    {companyOptions.map(company => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plant Name Dropdown */}
                <div className={styles.formGroup}>
                  <label>
                    <FiHome className={styles.inputIcon} />
                    Plant Name
                  </label>
                  <select
                    name="plantName"
                    value={formData.plantName}
                    onChange={handleInputChange}
                    required
                    className={styles.plantSelect}
                    disabled={!formData.companyName}
                  >
                    <option value="">Select Plant</option>
                    {plantOptions.map(plant => (
                      <option key={plant} value={plant}>
                        {plant}
                      </option>
                    ))}
                  </select>
                  {!formData.companyName && (
                    <small className={styles.selectHint}>Please select a company first</small>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label>
                    <FiUserPlus className={styles.inputIcon} />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <FiUserPlus className={styles.inputIcon} />
                    GEN ID
                  </label>
                  <input
                    type="text"
                    name="genId"
                    value={formData.genId}
                    onChange={handleInputChange}
                    placeholder="Enter GEN ID"
                  />
                </div>
                                      
                <div className={styles.formGroup}>
                  <label>
                    <FiKey className={styles.inputIcon} />
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUserId}
                    placeholder={editingUserId ? "Leave blank to keep current" : "Enter password"}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>
                    <FiMail className={styles.inputIcon} />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email"
                  />
                </div>
                
                {/* Department Dropdown */}
                <div className={styles.formGroup}>
                  <label>
                    <FiBriefcase className={styles.inputIcon} />
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className={styles.plantSelect}
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map(dept => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Role Dropdown */}
                <div className={styles.formGroup}>
                  <label>
                    <FiKey className={styles.inputIcon} />
                    Role
                  </label>
                  <select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleInputChange}
                    className={styles.roleSelect}
                    required
                  >
                    <option value="">Select Role</option>
                    {roleOptions.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className={styles.buttonLoader}></span>
                  ) : (
                    editingUserId ? 'Update User' : 'Create User'
                  )}
                </button>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowCreateUserModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Manage Options Modal */}
      {showManageOptionsModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.modalOverlay}
          onClick={() => {
            setShowManageOptionsModal(false);
            resetManageForm();
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <FiSettings className={styles.modalIcon} />
                <h3>Manage Options</h3>
              </div>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setShowManageOptionsModal(false);
                  resetManageForm();
                }}
              >
                <FiX />
              </button>
            </div>
            
            <div className={styles.manageOptionsContent}>
              <div className={styles.tabs}>
                <button 
                  className={`${styles.tab} ${activeTab === 'companies' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('companies')}
                >
                  Companies
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'plants' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('plants')}
                >
                  Plants
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'departments' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('departments')}
                >
                  Departments
                </button>
              </div>

              {/* Companies Tab */}
              {activeTab === 'companies' && (
                <div>
                  <form onSubmit={handleAddCompany} className={styles.manageForm}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Company Name</label>
                        <input
                          type="text"
                          name="companyName"
                          value={manageFormData.companyName}
                          onChange={handleManageInputChange}
                          required
                          placeholder="Enter company name"
                        />
                      </div>
                      <button type="submit" className={styles.submitButton}>
                        Add Company
                      </button>
                    </div>
                  </form>

                  <div className={styles.manageTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Company Name</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyOptions.map(company => (
                          <tr key={company.id}>
                            <td>{company.id}</td>
                            <td>{company.name}</td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button 
                                  className={styles.deleteButton}
                                  onClick={() => handleDeleteCompany(company.id)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Plants Tab */}
              {activeTab === 'plants' && (
                <div>
                  <form onSubmit={handleAddPlant} className={styles.manageForm}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Company</label>
                        <select
                          name="companyId"
                          value={manageFormData.companyId}
                          onChange={handleManageInputChange}
                          required
                        >
                          <option value="">Select Company</option>
                          {companyOptions.map(company => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Plant Name</label>
                        <input
                          type="text"
                          name="plantName"
                          value={manageFormData.plantName}
                          onChange={handleManageInputChange}
                          required
                          placeholder="Enter plant name"
                        />
                      </div>
                      <button type="submit" className={styles.submitButton}>
                        Add Plant
                      </button>
                    </div>
                  </form>

                  <div className={styles.manageTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Plant Name</th>
                          <th>Company</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPlants.map(plant => (
                          <tr key={plant.id}>
                            <td>{plant.id}</td>
                            <td>{plant.name}</td>
                            <td>{plant.company_name}</td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button 
                                  className={styles.deleteButton}
                                  onClick={() => handleDeletePlant(plant.id)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Departments Tab */}
              {activeTab === 'departments' && (
                <div>
                  <form onSubmit={handleAddDepartment} className={styles.manageForm}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Department Name</label>
                        <input
                          type="text"
                          name="departmentName"
                          value={manageFormData.departmentName}
                          onChange={handleManageInputChange}
                          required
                          placeholder="Enter department name"
                        />
                      </div>
                      <button type="submit" className={styles.submitButton}>
                        Add Department
                      </button>
                    </div>
                  </form>

                  <div className={styles.manageTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Department Name</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departmentOptions.map(dept => (
                          <tr key={dept.id}>
                            <td>{dept.id}</td>
                            <td>{dept.name}</td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button 
                                  className={styles.deleteButton}
                                  onClick={() => handleDeleteDepartment(dept.id)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default UserRole;
