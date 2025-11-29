import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import Card from '../common/Card';

const AppointmentCard = ({ appointment, onPress, onCancel }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED': return '#2196F3';
      case 'CONFIRMED': return '#4CAF50';
      case 'CANCELLED': return '#f44336';
      case 'COMPLETED': return '#6200EE';
      default: return '#BDBDBD';
    }
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.doctorName}>
          Dr. {appointment.doctorId?.personalInfo?.firstName} {appointment.doctorId?.personalInfo?.lastName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>
            {appointment.status}
          </Text>
        </View>
      </View>
      
      <Text style={styles.department}>
        {appointment.department}
      </Text>
      
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {format(parseISO(appointment.appointmentDate), 'MMM dd, yyyy')}
        </Text>
        <Text style={styles.time}>
          {appointment.appointmentTime}
        </Text>
      </View>

      {appointment.status === 'SCHEDULED' && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => onCancel(appointment)}
        >
          <Text style={styles.cancelButtonText}>Hủy lịch hẹn</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  department: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#ff4444',
    fontWeight: '500',
  },
});

export default AppointmentCard;