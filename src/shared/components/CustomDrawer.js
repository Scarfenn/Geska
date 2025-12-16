import { View, Text } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import createStyles from "../../tasks/styles/styles";
import { themes } from "../../tasks/styles/themes";

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
          borderColor: theme.text + "33",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "bold", color: theme.text }}>
          Geska
        </Text>

        <Text style={{ fontSize: 14, color: theme.pendingText }}>
          Organización simple, bonita y tuya.
        </Text>
      </View>

      {/* ITEMS */}
      <View style={{ flex: 1, backgroundColor: theme.card, marginTop: 5 }}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
}
