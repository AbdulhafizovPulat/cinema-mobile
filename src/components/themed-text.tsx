import React from 'react';
import { Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps;

export function ThemedText({ style, children, ...rest }: ThemedTextProps) {
  return (
    <Text style={[{ color: '#FFFFFF' }, style]} {...rest}>
      {children}
    </Text>
  );
}
