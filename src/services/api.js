import { supabase } from './auth';

class ApiService {
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

  // Audit Data
  async getAuditData(auditType) {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';

      let query = this.supabase
        .from(tableName)
        .select('*')
        .order('sn', { ascending: true });

      // Filter by plant for non-admin users
      if (user && user.role !== 'Super Admin') {
        const { data: userData } = await this.supabase
          .from('users')
          .select('plant_name')
          .eq('id', user.id)
          .single();

        if (userData && userData.plant_name) {
          query = query.eq('location', userData.plant_name);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(record => ({
        ID: record.id,
        SN: record.sn,
        Location: record.location,
        DomainClauses: record.domain_clauses,
        DateOfAudit: record.date_of_audit,
        DateOfSubmission: record.date_of_submission,
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
    } catch (err) {
      console.error('Error fetching audit data:', err);
      return [];
    }
  }

  async uploadAuditFile(formData, auditType) {
    try {
      // This would need to be handled differently in Supabase
      // You might want to use Supabase Storage and process files client-side
      // or use a serverless function
      throw new Error('File upload needs to be implemented with Supabase Storage');
    } catch (err) {
      throw new Error(err.message || 'Upload failed');
    }
  }

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

  async uploadEvidence(formData) {
    try {
      // Implement file upload to Supabase Storage
      const file = formData.get('file');
      const recordId = formData.get('record_id');
      const auditType = formData.get('audit_type');

      const fileName = `evidence_${recordId}_${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('audit-evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update the audit record
      const tableName = auditType === 'internal' ? 'internal_audits' : 'external_audits';
      const { error } = await this.supabase
        .from(tableName)
        .update({
          evidence: fileName,
          status: 'Closed'
        })
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

export default new ApiService();