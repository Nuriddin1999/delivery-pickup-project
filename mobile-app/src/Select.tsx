import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  placeholder: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}

/**
 * A select: the field, and under it a list of the same width with a check
 * next to the chosen option. The list is part of the layout (not floating),
 * so on Android every row stays tappable. Closing on a tap outside is left
 * to the screen, which knows what "outside" is.
 */
export function Select({ options, value, placeholder, open, onOpenChange, onChange }: Props) {
  const chosen = options.find((o) => o.value === value);

  return (
    <View>
      <Pressable
        style={[styles.field, open && styles.fieldOpen]}
        onPress={() => onOpenChange(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.fieldText, !chosen && styles.placeholder]} numberOfLines={1}>
          {chosen?.label ?? placeholder}
        </Text>
        <Text style={[styles.chevron, open && styles.chevronOpen]}>▾</Text>
      </Pressable>

      {open && (
        <View style={styles.list}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                  onPress={() => {
                    onChange(o.value);
                    onOpenChange(false);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{o.label}</Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const BLUE = '#2563eb';

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#fff',
  },
  fieldOpen: { borderColor: BLUE },
  fieldText: { flex: 1, fontSize: 16, color: '#0f172a' },
  placeholder: { color: '#94a3b8' },
  chevron: { fontSize: 16, color: '#475569' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  list: {
    marginTop: 4,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 48 },
  rowSelected: { backgroundColor: '#eff6ff' },
  rowPressed: { backgroundColor: '#f1f5f9' },
  rowText: { flex: 1, fontSize: 16, color: '#0f172a' },
  rowTextSelected: { color: BLUE, fontWeight: '600' },
  check: { fontSize: 18, color: BLUE, fontWeight: '700' },
});
