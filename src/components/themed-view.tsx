import React from 'react';
import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, children, ...rest }: ThemedViewProps) {
  return (
    <View style={[{ backgroundColor: '#09090D' }, style]} {...rest}>
      {children}
    </View>
  );
}
