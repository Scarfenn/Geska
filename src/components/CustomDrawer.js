import { View, Text } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";

export default function CustomDrawer(props) {
  const styles = createStyles(props.themeName, props.mode);

  const theme = themes[props.themeName][props.mode];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      
      {/* HEADER DEL DRAWER */}
      <View
        style={{
          padding: 20,
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderTopWidth: 1,
          borderColor: theme.text + "33",
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "bold", color: theme.text }}>
          Geska
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
          <Ionicons 
            name="sparkles-outline"
            size={14}
            color={theme.pendingText}
          />
          <Text style={{ fontSize: 14, color: theme.pendingText, marginLeft: 3 }}>
            Organiza tu día y rutina
          </Text>
        </View>
      </View>

      {/* ITEMS */}
      <View style={{ flex: 1, backgroundColor: theme.card, marginTop: 5 }}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
}
