import { View, Text, StatusBar } from "react-native";
import createStyles from "@/tasks/styles/styles";

export default function CalendarScreen({ themeName, mode }) {

  const styles = createStyles(themeName, mode);

  return (
    <View style={styles.calendarContainer}>
      <StatusBar
        barStyle={mode === "light" ? "dark-content" : "light-content"}
      />

      <View style={styles.calendarBox}>
        <Text style={styles.calendarTitle}>Calendario</Text>
        <Text style={styles.calendarSubtitle}>En construcción</Text>
        <Text style={styles.calendarDescription}>
          Aquí podrás ver tus actividades, tareas y eventos de los días.
        </Text>
      </View>
    </View>
  );
}
