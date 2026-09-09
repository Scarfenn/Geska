import { View, Text } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";

export default function CustomDrawer(props) {
  const styles = createStyles(props.themeName, props.mode);

  const theme = themes[props.themeName][props.mode];

    const upcomingModules = [
      {
        label: "Calendario",
        icon: "calendar-outline",
      },
      {
        label: "Cocina",
        icon: "restaurant-outline",
      },
      {
        label: "Entrenamiento",
        icon: "barbell-outline",
      }
    ];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.fill}>
      
      {/* HEADER DEL DRAWER */}
      <View
        style={styles.drawerHeader}
      >
        <Text style={styles.drawerTitle}>
          Geska
        </Text>
        <View style={styles.drawerSubtitleRow}>
          <Ionicons 
            name="sparkles-outline"
            size={14}
            color={theme.pendingText}
          />
          <Text style={styles.drawerSubtitle}>
            Organiza tu día y rutina
          </Text>
        </View>
      </View>

      {/* ITEMS */}
      <View style={styles.drawerItems}>
        <DrawerItemList {...props} />
          {/* SECCIÓN PRÓXIMAMENTE */}
          <View style={styles.upcomingSection}>
            <Text
              style={[
                styles.upcomingTitle,
                {
                  color: theme.inactiveCategoryText,
                },
              ]}
            >
              PRÓXIMAMENTE
            </Text>

            {upcomingModules.map((item) => (
              <View
                key={item.label}
                style={styles.upcomingItem}
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={theme.inactiveCategoryText}
                />

                <Text
                  style={[
                    styles.upcomingLabel,
                    {
                      color: theme.inactiveCategoryText,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
      </View>
    </DrawerContentScrollView>
  );
}
