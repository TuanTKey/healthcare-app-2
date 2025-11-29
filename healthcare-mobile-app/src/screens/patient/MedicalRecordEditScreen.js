import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TextInput from '../../components/common/TextInput';

const MedicalRecordEditScreen = ({ route, navigation }) => {
  const { recordId, record: initialRecord } = route.params;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    symptoms: '',
    physicalExamination: '',
    diagnoses: '',
    treatmentPlan: '',
    notes: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
    }
  });

  useEffect(() => {
    navigation.setOptions({
      title: 'Sửa hồ sơ bệnh án',
      headerShown: true,
    });
    
    if (initialRecord) {
      initializeForm(initialRecord);
    } else {
      loadRecord();
    }
  }, [recordId]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching medical record for edit:', recordId);
      
      const response = await api.get(`/medicalRecord/${recordId}`);
      let recordData = response.data?.data || response.data;
      
      initializeForm(recordData);
    } catch (error) {
      console.error('❌ Lỗi tải hồ sơ:', error.message);
      Alert.alert('Lỗi', 'Không thể tải hồ sơ bệnh án');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (record) => {
    setFormData({
      chiefComplaint: record.chiefComplaint || '',
      historyOfPresentIllness: record.historyOfPresentIllness || '',
      symptoms: Array.isArray(record.symptoms) ? record.symptoms.join(', ') : record.symptoms || '',
      physicalExamination: record.physicalExamination || '',
      diagnoses: Array.isArray(record.diagnoses) ? record.diagnoses.map(d => d.description || d).join(', ') : record.diagnoses || '',
      treatmentPlan: record.treatmentPlan || '',
      notes: record.notes || '',
      vitalSigns: {
        bloodPressure: record.vitalSigns?.bloodPressure || '',
        heartRate: String(record.vitalSigns?.heartRate || ''),
        temperature: String(record.vitalSigns?.temperature || ''),
        respiratoryRate: String(record.vitalSigns?.respiratoryRate || ''),
      }
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVitalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vitalSigns: {
        ...prev.vitalSigns,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving medical record:', recordId);
      
      // Prepare data for submission - only include non-empty values
      const updateData = {
        chiefComplaint: formData.chiefComplaint || undefined,
        historyOfPresentIllness: formData.historyOfPresentIllness || undefined,
        symptoms: formData.symptoms.split(',').map(s => s.trim()).filter(s => s) || undefined,
        physicalExamination: formData.physicalExamination || undefined,
        diagnoses: formData.diagnoses.split(',').map(d => ({ description: d.trim() })).filter(d => d.description) || undefined,
        treatmentPlan: formData.treatmentPlan || undefined,
        notes: formData.notes || undefined,
        vitalSigns: {
          bloodPressure: formData.vitalSigns.bloodPressure || undefined,
          heartRate: formData.vitalSigns.heartRate ? parseInt(formData.vitalSigns.heartRate) : undefined,
          temperature: formData.vitalSigns.temperature ? parseFloat(formData.vitalSigns.temperature) : undefined,
          respiratoryRate: formData.vitalSigns.respiratoryRate ? parseInt(formData.vitalSigns.respiratoryRate) : undefined,
        }
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || (Array.isArray(updateData[key]) && updateData[key].length === 0)) {
          delete updateData[key];
        }
      });

      // Clean up vitalSigns object
      if (updateData.vitalSigns) {
        Object.keys(updateData.vitalSigns).forEach(key => {
          if (updateData.vitalSigns[key] === undefined) {
            delete updateData.vitalSigns[key];
          }
        });
        if (Object.keys(updateData.vitalSigns).length === 0) {
          delete updateData.vitalSigns;
        }
      }

      console.log('📦 Final update data:', updateData);

      const response = await api.put(`/medicalRecord/${recordId}`, updateData);
      console.log('💾 Save response:', response.data);
      
      Alert.alert('Thành công', 'Hồ sơ bệnh án đã được cập nhật');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Lỗi lưu hồ sơ:', error.message);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Chief Complaint */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            LÝ DO KHÁM
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập lý do khám"
            value={formData.chiefComplaint}
            onChangeText={(value) => handleInputChange('chiefComplaint', value)}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* History of Present Illness */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            TIỀN SỬ BỆNH HIỆN TẠI
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập tiền sử bệnh"
            value={formData.historyOfPresentIllness}
            onChangeText={(value) => handleInputChange('historyOfPresentIllness', value)}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Symptoms */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            TRIỆU CHỨNG
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập các triệu chứng (cách nhau bằng dấu phẩy)"
            value={formData.symptoms}
            onChangeText={(value) => handleInputChange('symptoms', value)}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Vital Signs */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            CHỈ SỐ SINH HIỆU
          </Text>
          <TextInput
            mode="outlined"
            label="Huyết áp"
            placeholder="vd: 120/80"
            value={formData.vitalSigns.bloodPressure}
            onChangeText={(value) => handleVitalChange('bloodPressure', value)}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Nhịp tim (lần/phút)"
            placeholder="vd: 72"
            value={formData.vitalSigns.heartRate}
            onChangeText={(value) => handleVitalChange('heartRate', value)}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Nhiệt độ (°C)"
            placeholder="vd: 37.5"
            value={formData.vitalSigns.temperature}
            onChangeText={(value) => handleVitalChange('temperature', value)}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Nhịp thở (lần/phút)"
            placeholder="vd: 16"
            value={formData.vitalSigns.respiratoryRate}
            onChangeText={(value) => handleVitalChange('respiratoryRate', value)}
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Physical Examination */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            KHÁM LÂM SÀNG
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập kết quả khám lâm sàng"
            value={formData.physicalExamination}
            onChangeText={(value) => handleInputChange('physicalExamination', value)}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Diagnoses */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            CHẨN ĐOÁN
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập các chẩn đoán (cách nhau bằng dấu phẩy)"
            value={formData.diagnoses}
            onChangeText={(value) => handleInputChange('diagnoses', value)}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Treatment Plan */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            KẾ HOẠCH ĐIỀU TRỊ
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập kế hoạch điều trị"
            value={formData.treatmentPlan}
            onChangeText={(value) => handleInputChange('treatmentPlan', value)}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Notes */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            GHI CHÚ
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập ghi chú thêm"
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
        >
          Lưu
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={saving}
          style={styles.button}
        >
          Hủy
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  section: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
    fontSize: 13,
  },
  input: {
    marginBottom: 12,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  button: {
    marginBottom: 8,
  },
});

export default MedicalRecordEditScreen;
