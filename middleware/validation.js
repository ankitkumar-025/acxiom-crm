/**
 * Centralized Validation Engine for Client & Server Multi-Level Enforcement
 * Implements PDF Specification Section 5 & Section 17
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Standard 10-digit mobile number format
const PHONE_REGEX = /^[0-9]{10}$/;
// Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_-])[A-Za-z\d@$!%*?&#^()_-]{8,}$/;

class Validator {
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
  }

  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return PHONE_REGEX.test(cleanPhone);
  }

  static validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return PASSWORD_REGEX.test(password);
  }

  static isDateTodayOrFuture(dateStr) {
    if (!dateStr) return false;
    const inputDate = new Date(dateStr);
    if (isNaN(inputDate.getTime())) return false;
    
    // Normalize to date-only string YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);
    return inputDate >= today;
  }

  /**
   * Validate Customer input model
   */
  static validateCustomer(data, db, existingCustomerId = null) {
    const errors = [];

    // Customer Name
    if (!data.CustomerName || !data.CustomerName.trim()) {
      errors.push('Customer Name is required.');
    } else if (data.CustomerName.trim().length > 100) {
      errors.push('Customer Name cannot exceed 100 characters.');
    }

    // Email
    if (!data.Email || !data.Email.trim()) {
      errors.push('Email address is required.');
    } else if (!this.validateEmail(data.Email)) {
      errors.push('Enter a valid email address (e.g. user@example.com).');
    } else {
      // Uniqueness check
      const query = existingCustomerId
        ? 'SELECT CustomerId FROM Customers WHERE Email = ? AND CustomerId != ?'
        : 'SELECT CustomerId FROM Customers WHERE Email = ?';
      const params = existingCustomerId ? [data.Email.trim(), existingCustomerId] : [data.Email.trim()];
      const existing = db.prepare(query).get(...params);
      if (existing) {
        errors.push(`A customer with email "${data.Email}" already exists.`);
      }
    }

    // Phone
    if (!data.Phone || !data.Phone.trim()) {
      errors.push('Phone number is required.');
    } else if (!this.validatePhone(data.Phone)) {
      errors.push('Enter a valid 10-digit phone number (digits only, e.g. 9876543210).');
    } else {
      // Uniqueness check
      const cleanPhone = data.Phone.replace(/[\s-]/g, '');
      const query = existingCustomerId
        ? 'SELECT CustomerId FROM Customers WHERE Phone = ? AND CustomerId != ?'
        : 'SELECT CustomerId FROM Customers WHERE Phone = ?';
      const params = existingCustomerId ? [cleanPhone, existingCustomerId] : [cleanPhone];
      const existing = db.prepare(query).get(...params);
      if (existing) {
        errors.push(`A customer with phone number "${data.Phone}" already exists.`);
      }
    }

    return errors;
  }

  /**
   * Validate Lead input model
   */
  static validateLead(data, db, existingLeadId = null) {
    const errors = [];

    // Lead Name
    if (!data.LeadName || !data.LeadName.trim()) {
      errors.push('Lead Name is required.');
    } else if (data.LeadName.trim().length > 100) {
      errors.push('Lead Name cannot exceed 100 characters.');
    }

    // Email
    if (!data.Email || !data.Email.trim()) {
      errors.push('Lead Email is required.');
    } else if (!this.validateEmail(data.Email)) {
      errors.push('Enter a valid email address.');
    }

    // Phone
    if (!data.Phone || !data.Phone.trim()) {
      errors.push('Lead Phone number is required.');
    } else if (!this.validatePhone(data.Phone)) {
      errors.push('Enter a valid 10-digit phone number.');
    }

    // Status
    const validStatuses = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
    if (data.Status && !validStatuses.includes(data.Status)) {
      errors.push(`Invalid Lead Status. Allowed values: ${validStatuses.join(', ')}.`);
    }

    // Expected Value
    if (data.ExpectedValue !== undefined && data.ExpectedValue !== '') {
      const val = parseFloat(data.ExpectedValue);
      if (isNaN(val) || val < 0) {
        errors.push('Expected Value must be a non-negative number.');
      }
    }

    return errors;
  }

  /**
   * Validate Opportunity input model
   */
  static validateOpportunity(data) {
    const errors = [];

    // Opportunity Name
    if (!data.OpportunityName || !data.OpportunityName.trim()) {
      errors.push('Opportunity Name is required.');
    }

    // Customer selection
    if (!data.CustomerId || isNaN(parseInt(data.CustomerId))) {
      errors.push('A valid Customer must be selected.');
    }

    // Amount: Must be greater than 0 for active sales opportunities
    const amount = parseFloat(data.Amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Opportunity Amount must be greater than 0.');
    }

    // Probability: Must be between 0 and 100 inclusive
    const prob = parseInt(data.Probability);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      errors.push('Probability must be between 0 and 100.');
    }

    // Expected Close Date: Cannot be in the past for active opportunities
    if (!data.ExpectedCloseDate) {
      errors.push('Expected Close Date is required.');
    } else if (!this.isDateTodayOrFuture(data.ExpectedCloseDate)) {
      errors.push('Expected Close Date cannot be in the past.');
    }

    // Stage
    const validStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    if (data.Stage && !validStages.includes(data.Stage)) {
      errors.push(`Invalid Stage. Allowed values: ${validStages.join(', ')}.`);
    }

    return errors;
  }

  /**
   * Validate Follow-Up input model
   */
  static validateFollowUp(data, isNew = true) {
    const errors = [];

    if (!data.Subject || !data.Subject.trim()) {
      errors.push('Follow-Up Subject is required.');
    }

    if (!data.FollowUpDate) {
      errors.push('Follow-Up Date is required.');
    } else if (isNew && !this.isDateTodayOrFuture(data.FollowUpDate)) {
      errors.push('Follow-up date cannot be earlier than today.');
    }

    if (!data.CustomerId && !data.LeadId && !data.OpportunityId) {
      errors.push('Follow-up must be associated with a Customer, Lead, or Opportunity.');
    }

    return errors;
  }
}

module.exports = Validator;
