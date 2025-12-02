import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  TextInput,
  Button,
  Searchbar,
  Divider,
  IconButton,
  ActivityIndicator,
  List,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';

const CreateBillScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems] = useState([
    { name: '', description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatients([]);
      return;
    }

    try {
      setSearchingPatient(true);
      const response = await api.get(`/patients?search=${query}&limit=10`);
      const patientList = response.data?.data?.patients || response.data?.data || [];
      setPatients(patientList);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearchingPatient(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatients([]);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = parseFloat(discount) || 0;
    return subtotal - discountAmount;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const handleCreateBill = async () => {
    if (!selectedPatient) {
      Alert.alert('Lỗi', 'Vui lòng chọn bệnh nhân');
      return;
    }

    const validItems = items.filter(item => item.name && item.unitPrice > 0);
    if (validItems.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất một dịch vụ/thuốc');
      return;
    }

    try {
      setLoading(true);
      
      const billData = {
        items: validItems.map(item => ({
          name: item.name,
          description: item.description || item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount: parseFloat(discount) || 0,
        notes,
      };

      const patientId = selectedPatient._id || selectedPatient.userId;
      await api.post(`/bills/patients/${patientId}/bills`, billData);

      Alert.alert('Thành công', 'Đã tạo hóa đơn thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating bill:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Patient Selection */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Chọn bệnh nhân</Text>
          
          {selectedPatient ? (
            <View style={styles.selectedPatient}>
              <View style={styles.patientInfo}>
                <MaterialIcons name="person" size={40} color="#1976d2" />
                <View style={styles.patientDetails}>
                  <Text style={styles.patientName}>
                    {selectedPatient.personalInfo?.firstName} {selectedPatient.personalInfo?.lastName}
                    {selectedPatient.name && ` (${selectedPatient.name})`}
                  </Text>
                  <Text style={styles.patientId}>
                    ID: {selectedPatient.patientId || selectedPatient._id?.slice(-8)}
                  </Text>
                  {selectedPatient.personalInfo?.phone && (
                    <Text style={styles.patientPhone}>{selectedPatient.personalInfo.phone}</Text>
                  )}
                </View>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setSelectedPatient(null)}
              />
            </View>
          ) : (
            <>
              <Searchbar
                placeholder="Tìm theo tên hoặc ID bệnh nhân..."
                onChangeText={setPatientSearch}
                value={patientSearch}
                style={styles.searchbar}
                loading={searchingPatient}
              />
              {patients.length > 0 && (
                <View style={styles.patientList}>
                  {patients.map((patient, index) => (
                    <TouchableOpacity
                      key={patient._id || index}
                      style={styles.patientItem}
                      onPress={() => handleSelectPatient(patient)}
                    >
                      <MaterialIcons name="person" size={24} color="#666" />
                      <View style={styles.patientItemInfo}>
                        <Text style={styles.patientItemName}>
                          {patient.personalInfo?.firstName} {patient.personalInfo?.lastName}
                        </Text>
                        <Text style={styles.patientItemId}>
                          {patient.patientId || patient._id?.slice(-8)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Bill Items */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dịch vụ / Thuốc</Text>
            <Button
              mode="text"
              icon="plus"
              onPress={handleAddItem}
              compact
            >
              Thêm
            </Button>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>#{index + 1}</Text>
                {items.length > 1 && (
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor="#f44336"
                    onPress={() => handleRemoveItem(index)}
                  />
                )}
              </View>
              
              <TextInput
                label="Tên dịch vụ/thuốc *"
                value={item.name}
                onChangeText={(value) => handleItemChange(index, 'name', value)}
                mode="outlined"
                style={styles.input}
              />
              
              <TextInput
                label="Mô tả"
                value={item.description}
                onChangeText={(value) => handleItemChange(index, 'description', value)}
                mode="outlined"
                style={styles.input}
              />
              
              <View style={styles.priceRow}>
                <TextInput
                  label="Số lượng"
                  value={item.quantity.toString()}
                  onChangeText={(value) => handleItemChange(index, 'quantity', value)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, styles.quantityInput]}
                />
                <TextInput
                  label="Đơn giá (VNĐ)"
                  value={item.unitPrice.toString()}
                  onChangeText={(value) => handleItemChange(index, 'unitPrice', value)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, styles.priceInput]}
                />
              </View>
              
              <Text style={styles.itemTotal}>
                Thành tiền: {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
              
              {index < items.length - 1 && <Divider style={styles.itemDivider} />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Tổng kết</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculateSubtotal())}</Text>
          </View>
          
          <View style={styles.discountRow}>
            <Text style={styles.summaryLabel}>Giảm giá</Text>
            <TextInput
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.discountInput}
              right={<TextInput.Affix text="VNĐ" />}
            />
          </View>
          
          <Divider style={styles.summaryDivider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notes */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Ghi chú thêm về hóa đơn..."
          />
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Hủy
        </Button>
        <Button
          mode="contained"
          onPress={handleCreateBill}
          style={styles.createButton}
          loading={loading}
          disabled={loading || !selectedPatient}
        >
          Tạo hóa đơn
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  selectedPatient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientDetails: {
    marginLeft: 15,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientId: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  patientPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  patientList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    maxHeight: 200,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientItemInfo: {
    marginLeft: 12,
  },
  patientItemName: {
    fontSize: 14,
    color: '#333',
  },
  patientItemId: {
    fontSize: 12,
    color: '#999',
  },
  itemContainer: {
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantityInput: {
    flex: 1,
    marginRight: 10,
  },
  priceInput: {
    flex: 2,
  },
  itemTotal: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 5,
  },
  itemDivider: {
    marginTop: 15,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountInput: {
    width: 150,
    height: 40,
    backgroundColor: '#fff',
  },
  summaryDivider: {
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingBottom: 30,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  createButton: {
    flex: 2,
    backgroundColor: '#4caf50',
  },
});

export default CreateBillScreen;
