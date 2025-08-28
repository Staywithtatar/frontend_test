// Utility functions for the Nurse Scheduling System

/**
 * Generate a random string for temporary tokens or IDs
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date to YYYY-MM-DD format
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format time to HH:MM format
 * @param {string} time - Time string
 * @returns {string} Formatted time string
 */
const formatTime = (time) => {
  if (!time) return null;
  return time.substring(0, 5); // Extract HH:MM from HH:MM:SS
};

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time of first range
 * @param {string} end1 - End time of first range
 * @param {string} start2 - Start time of second range
 * @param {string} end2 - End time of second range
 * @returns {boolean} True if ranges overlap
 */
const timeRangesOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(`2000-01-01 ${start1}`);
  const e1 = new Date(`2000-01-01 ${end1}`);
  const s2 = new Date(`2000-01-01 ${start2}`);
  const e2 = new Date(`2000-01-01 ${end2}`);
  
  return s1 < e2 && s2 < e1;
};

/**
 * Calculate the duration between two times in hours
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {number} Duration in hours
 */
const calculateDuration = (startTime, endTime) => {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  // Handle overnight shifts
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end - start;
  return diffMs / (1000 * 60 * 60); // Convert to hours
};

/**
 * Get shift type based on time
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {string} Shift type
 */
const getShiftTypeByTime = (startTime, endTime) => {
  const startHour = parseInt(startTime.split(':')[0]);
  
  if (startHour >= 6 && startHour < 14) return 'morning';
  if (startHour >= 14 && startHour < 22) return 'afternoon';
  return 'night';
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and message
 */
const validatePassword = (password) => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  return {
    isValid: true,
    message: 'Password is strong'
  };
};

/**
 * Sanitize input string to prevent SQL injection
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination metadata
 */
const generatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalItems = parseInt(total) || 0;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  
  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null
  };
};

/**
 * Format error message for API responses
 * @param {Error} error - Error object
 * @returns {string} Formatted error message
 */
const formatErrorMessage = (error) => {
  if (error.code === '23505') {
    return 'Duplicate entry - this record already exists';
  }
  if (error.code === '23503') {
    return 'Referenced record not found';
  }
  if (error.code === '23514') {
    return 'Data validation failed';
  }
  if (error.code === '42P01') {
    return 'Table not found';
  }
  if (error.code === '42703') {
    return 'Column not found';
  }
  
  return error.message || 'An unexpected error occurred';
};

/**
 * Check if a date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
const isFutureDate = (date) => {
  const checkDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return checkDate > today;
};

/**
 * Check if a date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  const checkDate = new Date(date);
  const today = new Date();
  return formatDate(checkDate) === formatDate(today);
};

/**
 * Get day of week name
 * @param {string|Date} date - Date to get day name for
 * @returns {string} Day name
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(date);
  return days[d.getDay()];
};

module.exports = {
  generateRandomString,
  formatDate,
  formatTime,
  timeRangesOverlap,
  calculateDuration,
  getShiftTypeByTime,
  isValidEmail,
  validatePassword,
  sanitizeInput,
  generatePagination,
  formatErrorMessage,
  isFutureDate,
  isToday,
  getDayName
};
