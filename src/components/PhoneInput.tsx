import React, { useEffect } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Phone } from 'lucide-react-native';

export const DEFAULT_UZ_PHONE_PREFIX = '+998 ';

export const formatUzPhone = (text: string): string => {
  // Extract all digits from input
  let digits = text.replace(/\D/g, '');

  // If user pasted or typed full country code 998 at start, remove it to get national part
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }

  // Max 9 national digits for Uzbekistan
  digits = digits.slice(0, 9);

  if (digits.length === 0) {
    return DEFAULT_UZ_PHONE_PREFIX;
  }

  let formatted = '+998';
  if (digits.length > 0) {
    formatted += ' ' + digits.slice(0, 2);
  }
  if (digits.length > 2) {
    formatted += ' ' + digits.slice(2, 5);
  }
  if (digits.length > 5) {
    formatted += ' ' + digits.slice(5, 7);
  }
  if (digits.length > 7) {
    formatted += ' ' + digits.slice(7, 9);
  }

  return formatted;
};

interface PhoneInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (value: string) => void;
  iconColor?: string;
  inputStyle?: any;
  containerStyle?: any;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  iconColor = '#8A8A9E',
  inputStyle,
  containerStyle,
  placeholder = '+998 ** *** ** **',
  ...rest
}) => {
  // Ensure default initial value is +998 if empty
  useEffect(() => {
    if (!value || value.trim() === '') {
      onChangeText(DEFAULT_UZ_PHONE_PREFIX);
    }
  }, []);

  const handleChangeText = (text: string) => {
    // Prevent removing +998
    if (text.length < DEFAULT_UZ_PHONE_PREFIX.length && !text.startsWith('+998')) {
      onChangeText(DEFAULT_UZ_PHONE_PREFIX);
      return;
    }
    const formatted = formatUzPhone(text);
    onChangeText(formatted);
  };

  return (
    <View style={[styles.inputWrapper, containerStyle]}>
      <Phone size={18} color={iconColor} />
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#6E6E82"
        value={value || DEFAULT_UZ_PHONE_PREFIX}
        onChangeText={handleChangeText}
        keyboardType="phone-pad"
        maxLength={17} // "+998 90 123 45 67" is 17 characters
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262638',
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
