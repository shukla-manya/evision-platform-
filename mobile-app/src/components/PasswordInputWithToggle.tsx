import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const TOGGLE_WIDTH = 44;
const ICON_SIZE = 22;

export type PasswordInputWithToggleProps = Omit<TextInputProps, 'secureTextEntry'>;

/**
 * Password field with a trailing eye control to show or hide the value.
 * Pass your shared `styles.input` (or equivalent) as `style`.
 */
export function PasswordInputWithToggle({ style, ...rest }: PasswordInputWithToggleProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        secureTextEntry={!visible}
        style={[style, styles.inputPad]}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityState={{ selected: visible }}
        hitSlop={8}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={ICON_SIZE}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  inputPad: {
    paddingRight: TOGGLE_WIDTH,
  },
  toggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TOGGLE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
