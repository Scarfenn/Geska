import { View, Text } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";

export default function CustomDrawer(props) {
  const insets = useSafeAreaInsets();
  // Keep the original navigation state and built-in item behavior in both lists.
  const descriptorsFor = footer => Object.fromEntries(
    Object.entries(props.descriptors).map(([key, descriptor]) => {
      const route = props.state.routes.find(item => item.key === key);
      const visible = (route?.name === "Ajustes") === footer;
      return [key, { ...descriptor, options: {
        ...descriptor.options,
        drawerItemStyle: visible ? descriptor.options.drawerItemStyle : { display: "none" },
      } }];
    })
  );
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
    <View style={[styles.fill, { backgroundColor: theme.card }] }>
    <DrawerContentScrollView {...props} style={styles.fill}>
      
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
        <DrawerItemList {...props} descriptors={descriptorsFor(false)} />
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
    <View style={{
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 12),
      paddingLeft: Math.max(insets.left, 12),
      paddingRight: Math.max(insets.right, 12),
    }}>
      <DrawerItemList {...props} descriptors={descriptorsFor(true)} />
    </View>
    </View>
  );
}
