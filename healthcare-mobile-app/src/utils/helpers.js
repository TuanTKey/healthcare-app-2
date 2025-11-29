import { format, parseISO } from 'date-fns';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
  } catch (error) {
    return dateString;
  }
};

export const getInitials = (firstName, lastName) => {
  const first = firstName ? firstName.charAt(0) : '';
  const last = lastName ? lastName.charAt(0) : '';
  return `${first}${last}`.toUpperCase();
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};