import { supabase } from './auth';
import * as XLSX from 'xlsx';

class api {
  constructor() {
    this.supabase = supabase;
  }
  
  async login(username, password) {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

      // For demo purposes, we're storing plain text passwords
      // In production, you should use Supabase Auth or hash passwords
      if (user.password !== password) {
        throw new Error('Invalid credentials');
      }

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ token })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Login failed');
      }

      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        token: token,
        department: user.department,
        UserID: user.id
      };

      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw new Error(err.message || 'Login failed');
    }
  }

  async getAllUsers() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('company_name', { ascending: true });

      if (error) throw error;

      return data.map(user => ({
        id: user.id,
        CompanyName: user.company_name,
        PlantName: user.plant_name,
        Username: user.username,
        GenId: user.gen_id,
        Email: user.email,
        Department: user.department,
        Role: user.role
      }));
    } catch (err) {
      throw new Error('Failed to fetch users');
    }
  }

  async createUser(userData) {
    try {
      // Check if username already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('username', userData.username)
        .single();

      if (existingUser) {
        throw new Error('Username already exists');
      }

      const { data, error } = await this.supabase
        .from('users')
        .insert([{
          company_name: userData.companyName,
          plant_name: userData.plantName,
          username: userData.username,
          gen_id: userData.genId,
          password: userData.password, // In production, hash this
          email: userData.email,
          department: userData.department,
          role: userData.role
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to create user');
    }
  }

  async updateUser(userId, userData) {
    try {
      // Check if username is taken by another user
      if (userData.username) {
        const { data: existingUser } = await this.supabase
          .from('users')
          .select('id')
          .eq('username', userData.username)
          .neq('id', userId)
          .single();

        if (existingUser) {
          throw new Error('Username already exists');
        }
      }

      const updateData = {
        company_name: userData.companyName,
        plant_name: userData.plantName,
        username: userData.username,
        gen_id: userData.genId,
        email: userData.email,
        department: userData.department,
        role: userData.role
      };

      // Only update password if provided
      if (userData.password) {
        updateData.password = userData.password;
      }

      const { error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to update user');
    }
  }

  async deleteUser(userId) {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to delete user');
    }
  }

  // ============ SUPPLIER MANAGEMENT ============
  async getSuppliers() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      let query = this.supabase
        .from('suppliers')
        .select(`
          *,
          companies (name),
          plants (name)
        `)
        .order('name');

      // Filter by plant for non-admin users
      if (user && user.role !== 'Super Admin') {
        const { data: userData } = await this.supabase
          .from('users')
          .select('plant_name')
          .eq('id', user.id)
          .single();

        if (userData && userData.plant_name) {
          query = query.eq('plant_name', userData.plant_name);
        }
      }
      
      const { data, error } = await query;

      if (error) throw error;

      return data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        company_name: supplier.companies?.name,
        company_id: supplier.company_id,
        plant_name: supplier.plants?.name,
        plant_id: supplier.plant_id,
        contact_person: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        category: supplier.category,
        status: supplier.status,
        registration_date: supplier.registration_date,
        last_audit_date: supplier.last_audit_date,
        next_audit_date: supplier.next_audit_date,
        rating: supplier.rating
      }));
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      return [];
    }
  }

  async createSupplier(supplierData) {
    try {
      const { data, error } = await this.supabase
        .from('suppliers')
        .insert([{
          name: supplierData.name,
          company_id: supplierData.company_id,
          plant_id: supplierData.plant_id,
          plant_name: supplierData.plant_name,
          contact_person: supplierData.contact_person,
          email: supplierData.email,
          phone: supplierData.phone,
          address: supplierData.address,
          category: supplierData.category,
          status: supplierData.status || 'Active',
          registration_date: new Date().toISOString().split('T')[0],
          rating: supplierData.rating || 0
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      throw new Error(err.message || 'Failed to create supplier');
    }
  }

  async updateSupplier(supplierId, supplierData) {
    try {
      const { error } = await this.supabase
        .from('suppliers')
        .update({
          name: supplierData.name,
          company_id: supplierData.company_id,
          plant_id: supplierData.plant_id,
          plant_name: supplierData.plant_name,
          contact_person: supplierData.contact_person,
          email: supplierData.email,
          phone: supplierData.phone,
          address: supplierData.address,
          category: supplierData.category,
          status: supplierData.status,
          last_audit_date: supplierData.last_audit_date,
          next_audit_date: supplierData.next_audit_date,
          rating: supplierData.rating
        })
        .eq('id', supplierId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to update supplier');
    }
  }

  async deleteSupplier(supplierId) {
    try {
      const { error } = await this.supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to delete supplier');
    }
  }

  // ============ RISK ASSESSMENT ============
  async getRiskAssessments() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      let query = this.supabase
        .from('risk_assessments')
        .select('*')
        .order('assessment_date', { ascending: false });

      // Filter by plant for non-admin users
      if (user && user.role !== 'Super Admin') {
        const { data: userData } = await this.supabase
          .from('users')
          .select('plant_name')
          .eq('id', user.id)
          .single();

        if (userData && userData.plant_name) {
          query = query.eq('plant_name', userData.plant_name);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(risk => ({
        id: risk.id,
        risk_id: risk.risk_id,
        plant_name: risk.plant_name,
        department: risk.department,
        process_area: risk.process_area,
        risk_description: risk.risk_description,
        risk_category: risk.risk_category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        risk_level: risk.risk_level,
        risk_score: risk.risk_score,
        existing_controls: risk.existing_controls,
        control_effectiveness: risk.control_effectiveness,
        residual_risk: risk.residual_risk,
        treatment_plan: risk.treatment_plan,
        responsible_person: risk.responsible_person,
        review_date: risk.review_date,
        status: risk.status,
        assessment_date: risk.assessment_date,
        assessed_by: risk.assessed_by
      }));
    } catch (err) {
      console.error('Error fetching risk assessments:', err);
      return [];
    }
  }

  async createRiskAssessment(riskData) {
    try {
      // Generate risk ID
      const riskId = `RISK-${Date.now().toString(36).toUpperCase()}`;
      
      // Calculate risk score and level
      const riskScore = riskData.likelihood * riskData.impact;
      let riskLevel = 'Low';
      if (riskScore >= 15) riskLevel = 'High';
      else if (riskScore >= 8) riskLevel = 'Medium';

      const { data, error } = await this.supabase
        .from('risk_assessments')
        .insert([{
          risk_id: riskId,
          plant_name: riskData.plant_name,
          department: riskData.department,
          process_area: riskData.process_area,
          risk_description: riskData.risk_description,
          risk_category: riskData.risk_category,
          likelihood: riskData.likelihood,
          impact: riskData.impact,
          risk_level: riskLevel,
          risk_score: riskScore,
          existing_controls: riskData.existing_controls,
          control_effectiveness: riskData.control_effectiveness,
          residual_risk: riskData.residual_risk,
          treatment_plan: riskData.treatment_plan,
          responsible_person: riskData.responsible_person,
          review_date: riskData.review_date,
          status: riskData.status || 'Open',
          assessment_date: new Date().toISOString().split('T')[0],
          assessed_by: JSON.parse(localStorage.getItem('user')).username
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      throw new Error(err.message || 'Failed to create risk assessment');
    }
  }

  async updateRiskAssessment(riskId, riskData) {
    try {
      // Recalculate risk score and level if likelihood or impact changed
      let riskLevel = riskData.risk_level;
      let riskScore = riskData.risk_score;
      
      if (riskData.likelihood && riskData.impact) {
        riskScore = riskData.likelihood * riskData.impact;
        if (riskScore >= 15) riskLevel = 'High';
        else if (riskScore >= 8) riskLevel = 'Medium';
        else riskLevel = 'Low';
      }

      const { error } = await this.supabase
        .from('risk_assessments')
        .update({
          plant_name: riskData.plant_name,
          department: riskData.department,
          process_area: riskData.process_area,
          risk_description: riskData.risk_description,
          risk_category: riskData.risk_category,
          likelihood: riskData.likelihood,
          impact: riskData.impact,
          risk_level: riskLevel,
          risk_score: riskScore,
          existing_controls: riskData.existing_controls,
          control_effectiveness: riskData.control_effectiveness,
          residual_risk: riskData.residual_risk,
          treatment_plan: riskData.treatment_plan,
          responsible_person: riskData.responsible_person,
          review_date: riskData.review_date,
          status: riskData.status
        })
        .eq('id', riskId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to update risk assessment');
    }
  }

  async deleteRiskAssessment(riskId) {
    try {
      const { error } = await this.supabase
        .from('risk_assessments')
        .delete()
        .eq('id', riskId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to delete risk assessment');
    }
  }

  async getRiskMatrix() {
    try {
      const { data, error } = await this.supabase
        .from('risk_assessments')
        .select('likelihood, impact, risk_level')
        .order('assessment_date', { ascending: false });

      if (error) throw error;

      // Create a 5x5 matrix
      const matrix = Array(5).fill().map(() => Array(5).fill(0));
      data.forEach(risk => {
        if (risk.likelihood && risk.impact) {
          matrix[risk.likelihood - 1][risk.impact - 1]++;
        }
      });

      return matrix;
    } catch (err) {
      console.error('Error fetching risk matrix:', err);
      return Array(5).fill().map(() => Array(5).fill(0));
    }
  }

  // ============ ACCESS CONTROL ============
  async getAccessLogs() {
    try {
      const { data, error } = await this.supabase
        .from('access_logs')
        .select(`
          *,
          users (username, role, department)
        `)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        user_id: log.user_id,
        username: log.users?.username,
        user_role: log.users?.role,
        user_department: log.users?.department,
        action: log.action,
        page: log.page,
        details: log.details,
        ip_address: log.ip_address,
        timestamp: log.timestamp,
        status: log.status
      }));
    } catch (err) {
      console.error('Error fetching access logs:', err);
      return [];
    }
  }

  async getUserRoles() {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching roles:', err);
      return [];
    }
  }

  async getRolePermissions() {
    try {
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select(`
          *,
          roles (name),
          permissions (name, module, description)
        `)
        .order('role_id');

      if (error) throw error;

      // Group by role
      const permissionsByRole = {};
      data.forEach(rp => {
        if (!permissionsByRole[rp.role_id]) {
          permissionsByRole[rp.role_id] = {
            role_id: rp.role_id,
            role_name: rp.roles.name,
            permissions: []
          };
        }
        permissionsByRole[rp.role_id].permissions.push({
          permission_id: rp.permission_id,
          permission_name: rp.permissions.name,
          module: rp.permissions.module,
          description: rp.permissions.description
        });
      });

      return Object.values(permissionsByRole);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      return [];
    }
  }

  async logAccess(action, page, details = '', status = 'success') {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      // Get IP address (you might need to use a service or serverless function for this)
      const ip_address = '127.0.0.1'; // Placeholder

      const { error } = await this.supabase
        .from('access_logs')
        .insert([{
          user_id: user.id,
          action,
          page,
          details,
          ip_address,
          timestamp: new Date().toISOString(),
          status
        }]);

      if (error) console.error('Error logging access:', error);
    } catch (err) {
      console.error('Error logging access:', err);
    }
  }

  async updateUserRole(userId, roleId) {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to update user role');
    }
  }

  async assignPermissionToRole(roleId, permissionId) {
    try {
      const { error } = await this.supabase
        .from('role_permissions')
        .insert([{
          role_id: roleId,
          permission_id: permissionId
        }]);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to assign permission');
    }
  }

  async removePermissionFromRole(roleId, permissionId) {
    try {
      const { error } = await this.supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to remove permission');
    }
  }

  async getAvailablePermissions() {
    try {
      const { data, error } = await this.supabase
        .from('permissions')
        .select('*')
        .order('module, name');

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching permissions:', err);
      return [];
    }
  }

  async getActiveSessions() {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select(`
          *,
          users (username, role, department)
        `)
        .eq('is_active', true)
        .order('login_time', { ascending: false });

      if (error) throw error;

      return data.map(session => ({
        id: session.id,
        user_id: session.user_id,
        username: session.users?.username,
        user_role: session.users?.role,
        user_department: session.users?.department,
        login_time: session.login_time,
        last_activity: session.last_activity,
        ip_address: session.ip_address,
        user_agent: session.user_agent
      }));
    } catch (err) {
      console.error('Error fetching active sessions:', err);
      return [];
    }
  }

  async terminateSession(sessionId) {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      throw new Error('Failed to terminate session');
    }
  }

  // 1. UPDATED: Fetch Database data for audits + File data for dynamic sheets
  async getAuditData(auditType) {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';

      let query = this.supabase.from(tableName).select('*').order('sn', { ascending: true });

      if (user && user.role !== 'Super Admin') {
        const { data: userData } = await this.supabase.from('users').select('plant_name').eq('id', user.id).single();
        if (userData && userData.plant_name) { query = query.eq('location', userData.plant_name); }
      }

      const { data: dbData, error } = await query;
      if (error) throw error;

      // Ensure the interactive Audit tracker data is maintained from the database
      const auditRecords = dbData.map(record => ({
        ID: record.id,
        SN: record.sn,
        Location: record.location,
        DomainClauses: record.domain_clauses,
        DateOfAudit: record.date_of_audit,
        NCMinI: record.nc_min_i,
        ObservationDescription: record.observation_description,
        RootCauseAnalysis: record.root_cause_analysis,
        CorrectiveAction: record.corrective_action,
        PreventiveAction: record.preventive_action,
        DepartmentName: record.department_name,
        ClosingDates: record.closing_dates,
        Status: record.status,
        Evidence: record.evidence,
        UploadDate: record.upload_date
      }));

      const groupedData = { 'PIA_F01': auditRecords };
      
      // Magic happens here: Download the latest Excel file from the bucket to render the other tabs!
      try {
        const { data: files } = await this.supabase.storage
          .from('audit-files')
          .list('uploads', { sortBy: { column: 'created_at', order: 'desc' }, limit: 1 });

        if (files && files.length > 0) {
          const latestFile = files[0];
          const { data: fileBlob } = await this.supabase.storage.from('audit-files').download(`uploads/${latestFile.name}`);

          if (fileBlob) {
            const arrayBuffer = await fileBlob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            workbook.SheetNames.forEach(sheetName => {
              // Only parse the other sheets (Front Page, Summary, etc.) dynamically
              if (sheetName !== 'PIA_F01' && !sheetName.toLowerCase().includes('audit')) {
                // { header: 1 } ensures it maps the exact Excel Grid visually!
                groupedData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
              }
            });
          }
        }
      } catch (fileErr) {
         console.warn("Could not fetch raw excel for other tabs", fileErr);
      }

      return groupedData;
    } catch (err) {
      console.error('Error fetching audit data:', err);
      return {};
    }
  }

  // 2. NEW: Dynamically fetch layout sheets (Front Page, etc.) from the exact file selected
  async getFileLayouts(auditType, uploadDate) {
    try {
      const { data: files } = await this.supabase.storage
        .from('audit-files')
        .list('uploads', { sortBy: { column: 'created_at', order: 'desc' } });

      if (!files || files.length === 0) return {};

      let targetFile = null;
      const typedFiles = files.filter(f => f.name.startsWith(auditType));
      
      if (!uploadDate || uploadDate === 'All') {
        targetFile = typedFiles[0]; // Fallback to latest
      } else {
        const targetTime = new Date(uploadDate).getTime();
        targetFile = typedFiles.find(f => {
           const fileTime = new Date(f.created_at).getTime();
           // Find the file whose creation time matches the database upload time (within 2 mins)
           return Math.abs(fileTime - targetTime) < 120000; 
        }) || typedFiles[0];
      }

      if (targetFile) {
        const { data: fileBlob } = await this.supabase.storage.from('audit-files').download(`uploads/${targetFile.name}`);
        const arrayBuffer = await fileBlob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const layouts = {};
        workbook.SheetNames.forEach(sheetName => {
          if (!sheetName.toLowerCase().includes('audit') && sheetName !== 'PIA_F01' && !sheetName.toLowerCase().includes('summary')) {
            layouts[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
          }
        });
        return layouts;
      }
      return {};
    } catch (err) {
      console.warn("Could not fetch raw excel for other tabs", err);
      return {};
    }
  }

  // 3. Upload File (with Excel Date correction)
  async uploadAuditFile(formData, auditType) {
    try {
      const file = formData.get('file');
      if (!file) throw new Error('No file provided');

      const fileExt = file.name.split('.').pop();
      const fileName = `${auditType}_${Date.now()}.${fileExt}`;
      const { error: storageError } = await this.supabase.storage
        .from('audit-files') 
        .upload(`uploads/${fileName}`, file, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      const recordsToInsert = [];
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';

      const formatExcelDate = (excelDate) => {
        if (!excelDate) return null;
        if (typeof excelDate === 'number') {
          const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
        }
        if (excelDate instanceof Date) {
          const offset = excelDate.getTimezoneOffset();
          const adjustedDate = new Date(excelDate.getTime() - (offset*60*1000));
          return adjustedDate.toISOString().split('T')[0];
        }
        if (typeof excelDate === 'string') {
          const parsed = new Date(excelDate);
          if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
        }
        return null;
      };

      // Ensure exact timestamp matching between db and storage
      const dbUploadDate = new Date().toISOString();

      workbook.SheetNames.forEach(sheetName => {
        if (sheetName === 'PIA_F01' || sheetName.toLowerCase().includes('audit')) {
          let headerRowIndex = 0;
          const rawSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          rawSheet.forEach((row, idx) => {
             if (row.includes('S. No.') && row.includes('Location')) { headerRowIndex = idx; }
          });

          const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { range: headerRowIndex });
          
          sheetRows.forEach(row => {
            recordsToInsert.push({
              sn: row['S. No.'] || row['SN'] || null,
              location: row['Location'] || null,
              domain_clauses: row['Domain/Clauses'] || null,
              date_of_audit: formatExcelDate(row['Date of audit'] || row['Date of Audit']),
              nc_min_i: row['NC / MiN/ I *'] || row['NC Type'] || null,
              observation_description: row['Description'] || row['Observation'] || null,
              department_name: row['Department Name'] || null,
              status: row['Status'] || row['Status\n(Open / Closed)'] || 'Open',
              upload_date: dbUploadDate
            });
          });
        }
      });

      if (recordsToInsert.length > 0) {
        const { error: dbError } = await this.supabase.from(tableName).insert(recordsToInsert);
        if (dbError) throw dbError;
      }

      return { success: true, message: 'File uploaded successfully' };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Update Audit Record
  async updateAuditRecord(auditType, record) {
    try {
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';
      const { error } = await this.supabase
        .from(tableName)
        .update({
          root_cause_analysis: record.RootCauseAnalysis,
          corrective_action: record.CorrectiveAction,
          preventive_action: record.PreventiveAction,
          department_name: record.DepartmentName,
          closing_dates: record.ClosingDates,
          status: record.Status,
          evidence: record.Evidence
        })
        .eq('id', record.ID);

      if (error) throw error;
      return { success: true, message: 'Record updated successfully' };
    } catch (err) {
      throw new Error('Failed to update record');
    }
  }

  // Upload Evidence
  async uploadEvidence(formData) {
    try {
      const file = formData.get('file');
      const recordId = formData.get('record_id');
      const auditType = formData.get('audit_type');

      const fileName = `evidence_${recordId}_${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('audit-evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';
      const { error } = await this.supabase
        .from(tableName)
        .update({ evidence: fileName, status: 'Closed' })
        .eq('id', recordId);

      if (error) throw error;

      return { success: true, filename: fileName };
    } catch (err) {
      throw new Error('Evidence upload failed');
    }
  }

  async checkLastUploadDate(auditType) {
    try {
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('upload_date')
        .order('upload_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      return { lastUploadDate: data?.upload_date || null };
    } catch (err) {
      throw new Error('Failed to check last upload date');
    }
  }

  // Management Options
  async getCompanies() {
    try {
      const { data, error } = await this.supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Failed to fetch companies');
    }
  }

  async getPlants() {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .select(`
          *,
          companies (name)
        `)
        .order('name');

      if (error) throw error;

      return data.map(plant => ({
        id: plant.id,
        name: plant.name,
        company_name: plant.companies.name,
        company_id: plant.company_id
      }));
    } catch (err) {
      throw new Error('Failed to fetch plants');
    }
  }

  async getDepartments() {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Failed to fetch departments');
    }
  }

  async addCompany(companyName) {
    try {
      const { data, error } = await this.supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Company added successfully' };
    } catch (err) {
      throw new Error(err.message || 'Failed to add company');
    }
  }

  async addPlant(plantName, companyId) {
    try {
      const { data, error } = await this.supabase
        .from('plants')
        .insert([{ 
          name: plantName, 
          company_id: companyId 
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Plant added successfully' };
    } catch (err) {
      throw new Error(err.message || 'Failed to add plant');
    }
  }

  async addDepartment(departmentName) {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .insert([{ name: departmentName }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Department added successfully' };
    } catch (err) {
      throw new Error(err.message || 'Failed to add department');
    }
  }

  async deleteCompany(companyId) {
    try {
      // Check if company has plants
      const { data: plants } = await this.supabase
        .from('plants')
        .select('id')
        .eq('company_id', companyId);

      if (plants && plants.length > 0) {
        throw new Error('Cannot delete company with existing plants');
      }

      const { error } = await this.supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      return { success: true, message: 'Company deleted successfully' };
    } catch (err) {
      throw new Error(err.message || 'Failed to delete company');
    }
  }

  async deletePlant(plantId) {
    try {
      const { error } = await this.supabase
        .from('plants')
        .delete()
        .eq('id', plantId);

      if (error) throw error;
      return { success: true, message: 'Plant deleted successfully' };
    } catch (err) {
      throw new Error('Failed to delete plant');
    }
  }

  async deleteDepartment(departmentId) {
    try {
      const { error } = await this.supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;
      return { success: true, message: 'Department deleted successfully' };
    } catch (err) {
      throw new Error('Failed to delete department');
    }
  }
}

export default new api();
