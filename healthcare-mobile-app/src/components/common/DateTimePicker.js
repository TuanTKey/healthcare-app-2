import React, { useState, useMemo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DateTimePicker = ({ visible, onClose, onConfirm, mode = 'date', title = 'Chọn' }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const [hour, setHour] = useState(today.getHours());
  const [minute, setMinute] = useState(today.getMinutes());

  const days = useMemo(() => {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
  }, [year, month]);

  const years = useMemo(() => {
    const list = [];
    for (let i = today.getFullYear() - 5; i <= today.getFullYear() + 10; i++) {
      list.push(i);
    }
    return list;
  }, []);

  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const daysList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= days; i++) {
      list.push(i);
    }
    return list;
  }, [days]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    if (mode === 'date') {
      const selectedDate = new Date(year, month, day);
      onConfirm(selectedDate);
    } else if (mode === 'time') {
      const selectedTime = new Date();
      selectedTime.setHours(hour, minute);
      onConfirm(selectedTime);
    }
    onClose();
  };

  const renderPicker = (items, selectedValue, onSelect, label) => (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView
        style={styles.pickerScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.pickerItem,
              selectedValue === item && styles.pickerItemSelected,
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.pickerItemText,
                selectedValue === item && styles.pickerItemTextSelected,
              ]}
            >
              {String(item).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Date Picker */}
          {mode === 'date' && (
            <View style={styles.pickers}>
              {renderPicker(years, year, setYear, 'Năm')}
              {renderPicker(
                months.map((_, i) => i),
                month,
                setMonth,
                'Tháng'
              )}
              {renderPicker(daysList, day, setDay, 'Ngày')}
            </View>
          )}

          {/* Time Picker */}
          {mode === 'time' && (
            <View style={styles.pickers}>
              {renderPicker(hours, hour, setHour, 'Giờ')}
              {renderPicker(minutes, minute, setMinute, 'Phút')}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Chọn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickers: {
    flexDirection: 'row',
    height: 200,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#666',
  },
  pickerItemTextSelected: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#1976d2',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DateTimePicker;
