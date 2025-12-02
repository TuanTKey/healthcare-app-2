import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../services/api';

const CreateBillScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [searchingPrescription, setSearchingPrescription] = useState(false);
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [prescriptionResult, setPrescriptionResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  
  // Bill options
  const [consultationFee, setConsultationFee] = useState('50000');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  
  // Manual mode
  const [manualMode, setManualMode] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems] = useState([
    { name: '', description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Search prescription by code
  const searchPrescription = async () => {
    if (!prescriptionSearch.trim()) {
      setSearchError('Vui lòng nhập mã đơn thuốc');
      return;
    }

    try {
      setSearchingPrescription(true);
      setSearchError('');
      setPrescriptionResult(null);
      
      // Try to find by prescriptionId
      const response = await api.get(`/prescriptions?prescriptionId=${prescriptionSearch.trim()}`);
      const prescriptions = response.data?.data?.data || response.data?.data?.prescriptions || response.data?.data || [];
      
      if (Array.isArray(prescriptions) && prescriptions.length > 0) {
        const prescription = prescriptions[0];
        
        // Check if already has bill
        if (prescription.billCreated) {
          setSearchError('Đơn thuốc này đã được tạo hóa đơn');
          return;
        }
        
        setPrescriptionResult(prescription);
      } else {
        setSearchError('Không tìm thấy đơn thuốc với mã này');
      }
    } catch (error) {
      console.error('Error searching prescription:', error);
      setSearchError(error.response?.data?.message || 'Không thể tìm kiếm đơn thuốc');
    } finally {
      setSearchingPrescription(false);
    }
  };

  // Search patients for manual mode
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
    if (manualMode) {
      const timer = setTimeout(() => {
        searchPatients(patientSearch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [patientSearch, manualMode]);

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

  // Calculate totals for prescription mode
  const calculatePrescriptionTotal = () => {
    if (!prescriptionResult) return 0;
    
    const medicationTotal = prescriptionResult.medications?.reduce((sum, med) => {
      const price = med.dosage?.unitPrice || med.unitPrice || 10000;
      return sum + (med.totalQuantity * price);
    }, 0) || 0;
    
    const fee = parseFloat(consultationFee) || 0;
    const discountAmount = parseFloat(discount) || 0;
    
    return medicationTotal + fee - discountAmount;
  };

  // Calculate totals for manual mode
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateManualTotal = () => {
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Create bill from prescription
  const handleCreateBillFromPrescription = async () => {
    if (!prescriptionResult) {
      Alert.alert('Lỗi', 'Không có đơn thuốc để tạo hóa đơn');
      return;
    }

    try {
      setLoading(true);
      
      const billOptions = {
        consultationFee: parseFloat(consultationFee) || 0,
        discount: parseFloat(discount) || 0,
        notes,
      };

      await api.post(`/bills/from-prescription/${prescriptionResult._id}`, billOptions);

      Alert.alert('Thành công', 'Đã tạo hóa đơn từ đơn thuốc thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error creating bill:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  // Create bill manually
  const handleCreateBillManually = async () => {
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

  const clearPrescription = () => {
    setPrescriptionResult(null);
    setPrescriptionSearch('');
    setSearchError('');
    setConsultationFee('50000');
    setDiscount('0');
    setNotes('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#4caf50';
      case 'DISPENSED': return '#2196f3';
      case 'COMPLETED': return '#9c27b0';
      case 'CANCELLED': return '#f44336';
      case 'EXPIRED': return '#ff9800';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT': return 'Bản nháp';
      case 'ACTIVE': return 'Đang hoạt động';
      case 'DISPENSED': return 'Đã phát thuốc';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      case 'EXPIRED': return 'Hết hạn';
      default: return status;
    }
  };

  // Render prescription mode
  const renderPrescriptionMode = () => (
    <>
      {/* Search Prescription */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="search" size={20} color="#1976d2" /> Tìm đơn thuốc
        </Text>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchBarPrescription}>
            <MaterialIcons name="qr-code" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập mã đơn thuốc (VD: RX-20251202-001)"
              value={prescriptionSearch}
              onChangeText={(text) => {
                setPrescriptionSearch(text);
                setSearchError('');
              }}
              placeholderTextColor="#999"
              autoCapitalize="characters"
              onSubmitEditing={searchPrescription}
            />
            {searchingPrescription && (
              <ActivityIndicator size="small" color="#1976d2" />
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.searchButton, (!prescriptionSearch.trim() || searchingPrescription) && styles.searchButtonDisabled]}
            onPress={searchPrescription}
            disabled={searchingPrescription || !prescriptionSearch.trim()}
          >
            <Text style={styles.searchButtonText}>Tìm</Text>
          </TouchableOpacity>
        </View>
        
        {searchError ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#f44336" />
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        ) : null}
      </Card>

      {/* Prescription Result */}
      {prescriptionResult && (
        <>
          <Card style={styles.card}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.sectionTitle}>
                <MaterialIcons name="description" size={20} color="#4caf50" /> Thông tin đơn thuốc
              </Text>
              <TouchableOpacity onPress={clearPrescription}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.prescriptionInfo}>
              <View style={styles.prescriptionRow}>
                <Text style={styles.infoLabel}>Mã đơn:</Text>
                <Text style={styles.infoValue}>{prescriptionResult.prescriptionId}</Text>
              </View>
              
              <View style={styles.prescriptionRow}>
                <Text style={styles.infoLabel}>Ngày kê:</Text>
                <Text style={styles.infoValue}>{formatDate(prescriptionResult.issueDate)}</Text>
              </View>
              
              <View style={styles.prescriptionRow}>
                <Text style={styles.infoLabel}>Trạng thái:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescriptionResult.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(prescriptionResult.status) }]}>
                    {getStatusLabel(prescriptionResult.status)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Patient Info */}
            <View style={styles.patientSection}>
              <Text style={styles.subSectionTitle}>Bệnh nhân</Text>
              <View style={styles.patientCard}>
                <MaterialIcons name="person" size={36} color="#1976d2" />
                <View style={styles.patientDetails}>
                  <Text style={styles.patientName}>
                    {prescriptionResult.patientId?.personalInfo?.firstName} {prescriptionResult.patientId?.personalInfo?.lastName}
                  </Text>
                  <Text style={styles.patientMeta}>
                    {prescriptionResult.patientId?.personalInfo?.phone || 'Chưa có SĐT'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Doctor Info */}
            <View style={styles.doctorSection}>
              <Text style={styles.subSectionTitle}>Bác sĩ kê đơn</Text>
              <Text style={styles.doctorName}>
                BS. {prescriptionResult.doctorId?.personalInfo?.firstName} {prescriptionResult.doctorId?.personalInfo?.lastName}
              </Text>
            </View>
          </Card>

          {/* Medications List */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="medication" size={20} color="#ff9800" /> Danh sách thuốc ({prescriptionResult.medications?.length || 0})
            </Text>
            
            {prescriptionResult.medications?.map((med, index) => {
              const unitPrice = med.dosage?.unitPrice || med.unitPrice || 10000;
              const quantity = med.totalQuantity || 1;
              const itemTotal = quantity * unitPrice;
              
              return (
                <View key={index} style={styles.medicationItem}>
                  <View style={styles.medicationHeader}>
                    <Text style={styles.medicationNumber}>#{index + 1}</Text>
                    <Text style={styles.medicationName}>{med.name}</Text>
                  </View>
                  
                  <View style={styles.medicationDetails}>
                    {med.dosage && (
                      <Text style={styles.medicationInfo}>
                        Liều lượng: {med.dosage.value} {med.dosage.unit} - {med.dosage.form}
                      </Text>
                    )}
                    {med.frequency && (
                      <Text style={styles.medicationInfo}>
                        Tần suất: {med.frequency.timesPerDay}x/ngày - {med.frequency.instructions}
                      </Text>
                    )}
                    {med.duration && (
                      <Text style={styles.medicationInfo}>
                        Thời gian: {med.duration.value} {med.duration.unit}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.medicationPriceSection}>
                    <View style={styles.medicationPriceRow}>
                      <Text style={styles.priceLabel}>Số lượng:</Text>
                      <Text style={styles.priceValue}>{quantity}</Text>
                    </View>
                    <View style={styles.medicationPriceRow}>
                      <Text style={styles.priceLabel}>Đơn giá:</Text>
                      <Text style={styles.priceValue}>{formatCurrency(unitPrice)}</Text>
                    </View>
                    <View style={[styles.medicationPriceRow, styles.itemTotalRow]}>
                      <Text style={styles.itemTotalLabel}>Thành tiền:</Text>
                      <Text style={styles.itemTotalValue}>{formatCurrency(itemTotal)}</Text>
                    </View>
                  </View>
                  
                  {med.instructions && (
                    <Text style={styles.medicationInstructions}>
                      <MaterialIcons name="info" size={14} color="#666" /> {med.instructions}
                    </Text>
                  )}
                </View>
              );
            })}
          </Card>

          {/* Bill Options */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="tune" size={20} color="#9c27b0" /> Tùy chọn hóa đơn
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phí khám bệnh (VNĐ)</Text>
              <TextInput
                style={styles.textInput}
                value={consultationFee}
                onChangeText={setConsultationFee}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Giảm giá (VNĐ)</Text>
              <TextInput
                style={styles.textInput}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Ghi chú thêm về hóa đơn..."
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>
          </Card>

          {/* Summary */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              <MaterialIcons name="receipt" size={20} color="#1976d2" /> Tổng kết
            </Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tiền thuốc</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  prescriptionResult.medications?.reduce((sum, med) => {
                    const price = med.dosage?.unitPrice || med.unitPrice || 10000;
                    return sum + (med.totalQuantity * price);
                  }, 0) || 0
                )}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí khám bệnh</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(consultationFee) || 0)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá</Text>
              <Text style={[styles.summaryValue, { color: '#f44336' }]}>
                -{formatCurrency(parseFloat(discount) || 0)}
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculatePrescriptionTotal())}</Text>
            </View>
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
              onPress={handleCreateBillFromPrescription}
              style={styles.createButton}
              loading={loading}
              disabled={loading}
              color="#4caf50"
            >
              Tạo hóa đơn
            </Button>
          </View>
        </>
      )}

      {/* Empty state when no prescription */}
      {!prescriptionResult && !searchError && (
        <Card style={styles.emptyCard}>
          <MaterialIcons name="receipt-long" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Tìm kiếm đơn thuốc</Text>
          <Text style={styles.emptyText}>
            Nhập mã đơn thuốc để tìm kiếm và tạo hóa đơn
          </Text>
        </Card>
      )}
    </>
  );

  // Render manual mode
  const renderManualMode = () => (
    <>
      {/* Patient Selection */}
      <Card style={styles.card}>
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
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setSelectedPatient(null)}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên hoặc ID bệnh nhân..."
                value={patientSearch}
                onChangeText={setPatientSearch}
                placeholderTextColor="#999"
              />
              {searchingPatient && (
                <ActivityIndicator size="small" color="#1976d2" />
              )}
            </View>
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
      </Card>

      {/* Bill Items */}
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ / Thuốc</Text>
          <Button
            mode="text"
            onPress={handleAddItem}
            style={styles.addButton}
          >
            + Thêm
          </Button>
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>#{index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <MaterialIcons name="delete" size={20} color="#f44336" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên dịch vụ/thuốc *</Text>
              <TextInput
                style={styles.textInput}
                value={item.name}
                onChangeText={(value) => handleItemChange(index, 'name', value)}
                placeholder="Nhập tên dịch vụ hoặc thuốc"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={styles.textInput}
                value={item.description}
                onChangeText={(value) => handleItemChange(index, 'description', value)}
                placeholder="Mô tả chi tiết (tùy chọn)"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.priceRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Số lượng</Text>
                <TextInput
                  style={styles.textInput}
                  value={item.quantity.toString()}
                  onChangeText={(value) => handleItemChange(index, 'quantity', value)}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Đơn giá (VNĐ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={item.unitPrice.toString()}
                  onChangeText={(value) => handleItemChange(index, 'unitPrice', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <Text style={styles.itemTotal}>
              Thành tiền: {formatCurrency(item.quantity * item.unitPrice)}
            </Text>
            
            {index < items.length - 1 && <View style={styles.itemDivider} />}
          </View>
        ))}
      </Card>

      {/* Summary */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Tổng kết</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính</Text>
          <Text style={styles.summaryValue}>{formatCurrency(calculateSubtotal())}</Text>
        </View>
        
        <View style={styles.discountRow}>
          <Text style={styles.summaryLabel}>Giảm giá</Text>
          <View style={styles.discountInputContainer}>
            <TextInput
              style={styles.discountInput}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
            />
            <Text style={styles.discountSuffix}>VNĐ</Text>
          </View>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatCurrency(calculateManualTotal())}</Text>
        </View>
      </Card>

      {/* Notes */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Ghi chú thêm về hóa đơn..."
          placeholderTextColor="#999"
          textAlignVertical="top"
        />
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
          onPress={handleCreateBillManually}
          style={styles.createButton}
          loading={loading}
          disabled={loading || !selectedPatient}
          color="#4caf50"
        >
          Tạo hóa đơn
        </Button>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, !manualMode && styles.modeButtonActive]}
          onPress={() => setManualMode(false)}
        >
          <MaterialIcons 
            name="medication" 
            size={20} 
            color={!manualMode ? '#fff' : '#1976d2'} 
          />
          <Text style={[styles.modeButtonText, !manualMode && styles.modeButtonTextActive]}>
            Từ đơn thuốc
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, manualMode && styles.modeButtonActive]}
          onPress={() => setManualMode(true)}
        >
          <MaterialIcons 
            name="edit" 
            size={20} 
            color={manualMode ? '#fff' : '#1976d2'} 
          />
          <Text style={[styles.modeButtonText, manualMode && styles.modeButtonTextActive]}>
            Nhập thủ công
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {manualMode ? renderManualMode() : renderPrescriptionMode()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    margin: 15,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: '#1976d2',
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  modeButtonTextActive: {
    color: '#fff',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarPrescription: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  errorText: {
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  emptyCard: {
    margin: 15,
    padding: 40,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prescriptionInfo: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  prescriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  patientSection: {
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
  },
  patientDetails: {
    marginLeft: 15,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  doctorSection: {
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 14,
    color: '#333',
  },
  medicationItem: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff9800',
    marginRight: 10,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  medicationDetails: {
    marginBottom: 10,
  },
  medicationInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  medicationQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  medicationPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ffe0b2',
    paddingTop: 10,
    marginBottom: 5,
  },
  medicationPriceSection: {
    borderTopWidth: 1,
    borderTopColor: '#ffe0b2',
    paddingTop: 10,
    marginBottom: 5,
  },
  medicationPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ffe0b2',
  },
  itemTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  itemTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  medicationInstructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
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
  summaryDivider: {
    height: 1,
    backgroundColor: '#eee',
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
  },
  // Manual mode styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    paddingHorizontal: 0,
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
  removeButton: {
    padding: 8,
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
  deleteButton: {
    padding: 8,
  },
  priceRow: {
    flexDirection: 'row',
  },
  itemTotal: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 5,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 15,
    marginBottom: 10,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    width: 150,
  },
  discountInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  discountSuffix: {
    paddingHorizontal: 10,
    color: '#666',
  },
});

export default CreateBillScreen;
