import { createElement, useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import { formatDate, parseLocalDate } from "./dates";
import { useLanguage } from "./i18n";
import { styles, colors } from "./styles";

export interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  invalid?: boolean;
}

export default function DateField({
  value,
  onChange,
  minimumDate,
  invalid,
}: DateFieldProps) {
  const { lang } = useLanguage();
  if (Platform.OS === "web") {
    // react-native-web does not expose a typed <input type="date"> component,
    // so render the DOM node directly. Its value/onChange already use the
    // YYYY-MM-DD string form, matching the rest of the booking modal state.
    // The `lang` attribute tells the browser which locale to use for the
    // native calendar popup (month names, weekday headers, Clear/Today).
    const min = minimumDate ? formatDate(minimumDate) : undefined;
    return createElement("input", {
      type: "date",
      value,
      min,
      lang,
      onChange: (e: { target: { value: string } }) =>
        onChange(e.target.value),
      style: {
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: invalid ? colors.danger : colors.border,
        borderRadius: 8,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        fontSize: 14,
        color: colors.text,
        backgroundColor: colors.bg,
        fontFamily: "inherit",
        boxSizing: "border-box",
        width: "100%",
      },
    });
  }

  return <NativeDateField
    value={value}
    onChange={onChange}
    minimumDate={minimumDate}
    invalid={invalid}
  />;
}

function NativeDateField({
  value,
  onChange,
  minimumDate,
  invalid,
}: DateFieldProps) {
  const [show, setShow] = useState(false);
  // Lazy require so web bundles never pull in the native picker module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DateTimePicker =
    require("@react-native-community/datetimepicker").default;

  const current = (() => {
    try {
      return parseLocalDate(value);
    } catch {
      return new Date();
    }
  })();

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.input, invalid && styles.inputError]}
      >
        <Text style={{ color: colors.text, fontSize: 14 }}>
          {value || "YYYY-MM-DD"}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={current}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(
            _event: unknown,
            selected: Date | undefined,
          ) => {
            setShow(false);
            if (selected) onChange(formatDate(selected));
          }}
        />
      )}
    </>
  );
}
