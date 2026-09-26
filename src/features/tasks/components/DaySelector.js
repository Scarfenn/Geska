import useWeekNavigation from "@/features/tasks/hooks/useWeekNavigation";
import { generateWeek, isSameDay } from "@/features/tasks/domain/calendarDates";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PanGestureHandler,
} from "react-native-gesture-handler";

export default function DaySelector({
  selectedDay,
  setSelectedDay,
  theme,
}) {
  const { width } = useWindowDimensions();

  const { slideAnim, isAnimating, selectDay, goToday, goPrevWeek, goNextWeek, onGestureEvent, onHandlerStateChange } = useWeekNavigation(selectedDay, setSelectedDay, width);
  const week = generateWeek(selectedDay);
  const todayDate = new Date();
  const isTodaySelected = isSameDay(selectedDay, todayDate);

  return (
    <>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <TouchableOpacity
          onPress={goPrevWeek}
          disabled={isAnimating}
          style={{ padding: 10 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: "600",
            marginHorizontal: 12,
          }}
        >
          {selectedDay.toLocaleDateString(
            "es-CL",
            {
              weekday: "short",
              day: "numeric",
              month: "short",
            }
          )}
        </Text>

        <TouchableOpacity
          onPress={goNextWeek}
          disabled={isAnimating}
          style={{ padding: 10 }}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Semana */}
      <View
        style={{
          overflow: "hidden",
        }}
      >
        <PanGestureHandler
          enabled={!isAnimating}
          activeOffsetX={[-12, 12]}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={
            onHandlerStateChange
          }
        >
          <Animated.View
            style={{
              flexDirection: "row",
              justifyContent:
                "space-between",
              alignItems: "center",
              paddingHorizontal: 6,
              transform: [
                {
                  translateX:
                    slideAnim,
                },
              ],
            }}
          >
            {week.map((d) => {
              const isToday =
                isSameDay(
                  d,
                  todayDate
                );

              const isSelected =
                isSameDay(
                  d,
                  selectedDay
                );

              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  disabled={isAnimating}
                  onPress={() => selectDay(d)}
                  style={{
                    width: 42,
                    height: 52,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    backgroundColor:
                      isSelected
                        ? theme.primary
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? theme.onPrimary
                        : theme.text,
                      fontWeight:
                        isSelected
                          ? "700"
                          : "500",
                    }}
                  >
                    {d
                      .toLocaleDateString(
                        "es-CL",
                        {
                          weekday:
                            "short",
                        }
                      )
                      .replace(".", "")[0]
                      .toUpperCase()}
                  </Text>

                  <Text
                    style={{
                      color: isSelected
                        ? theme.onPrimary
                        : theme.text,
                      opacity: isSelected
                        ? 1
                        : 0.8,
                      fontWeight:
                        isSelected
                          ? "700"
                          : "500",
                    }}
                  >
                    {d.getDate()}
                  </Text>

                  {isToday &&
                    !isSelected && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            theme.primaryText,
                          marginTop: 3,
                        }}
                      />
                    )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Hoy */}
      {!isTodaySelected && (
        <TouchableOpacity
          onPress={goToday}
          disabled={isAnimating}
          style={{
            alignSelf: "center",
            backgroundColor:
              theme.primary,
            paddingVertical: 3,
            paddingHorizontal: 15,
            borderRadius: 20,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: theme.onPrimary,
              fontWeight: "600",
            }}
          >
            Hoy
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
