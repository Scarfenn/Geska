import { FlatList, Text, TouchableOpacity, TouchableWithoutFeedback, View, Animated, Easing} from 'react-native';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from './Alert';
import createStyles from '@/tasks/styles/styles';

export default function TaskList({
  tasks,
  toggleTaskDone,
  toggleSubtaskDone,
  removeTask,
  removeSubtask,
  themeName,
  mode,
  activeTaskId,
  setModalTaskId,
  openOptions,
  closeOptions,
  startEditTask,
  setActiveModal
}) {

  const menuAnimation = useRef(new Animated.Value(0)).current;
  const styles = createStyles(themeName, mode);

  const [collapsedTasks, setCollapsedTasks] = useState({});

  const toggleCollapse = (taskId) => {
    setCollapsedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const [confirmFuture, setConfirmFuture] = useState(null);
  const isFutureTask = (task) => {
    if (!task.date) return false;

    const today = new Date().toISOString().split("T")[0];
    return task.date > today;
  };


  const openMenu = (id) => {
    if (activeTaskId !== id) {
      Animated.sequence([
        Animated.timing(menuAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(menuAnimation, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
      openOptions(id);
    }
  };

  const closeMenu = () => {
    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      closeOptions();
    });
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={{ flex: 1 }}>
        {tasks.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20
          }}>
            <Ionicons
              name="document-text-outline"
              size={85}
              color={styles.categoryContainer.inactiveColor}
              style={{ marginBottom: 15 }}
            />
            <Text
              style={{
                textAlign: 'center',
                fontSize: 18,
                color: mode === 'light' ? '#444' : '#ccc',
                fontWeight: '600',
              }}
            >
              ¡No tienes ninguna tarea!
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                color: mode === 'light' ? '#666' : '#aaa',
                marginTop: 8,
              }}
            >
              Añade una con el botón{' '}
              <Ionicons name="add-circle-outline" size={17} color={mode === 'light' ? '#666' : '#aaa'} />
            </Text>
          </View>
        ) : (
          // Lista de tareas
          <FlatList
            data={tasks}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
                const total = item.subtasks?.length ?? 0;
                const done = item.subtasks?.filter(s => s.done).length ?? 0;
              return( 
              <View style={{ marginBottom: 3 }}>
                <View style={{ marginBottom: 6 }}>
                {/* Tarea principal */}
                <TouchableOpacity
                  activeOpacity={0.6}
                  style={styles.task}
                  onPress={() => {
                    if (isFutureTask(item) && !item.done) {
                      setConfirmFuture(item.id);
                    } else {
                      toggleTaskDone(item.id);
                    }
                  }}
                  onLongPress={() => openMenu(item.id)}
                >
                  {/* Icono */}
                  <Ionicons
                    name={
                      item.done
                        ? "checkmark-circle"
                        : isFutureTask(item)
                          ? "lock-closed-outline"
                          : "ellipse-outline"
                    }
                    size={24}
                    color={
                      item.done
                        ? styles.doneCheck.color
                        : isFutureTask(item)
                          ? styles.pendingText.color + "AA"
                          : styles.pendingCheck.color
                    }
                  />

                  {/* CONTENIDO EN COLUMNA */}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {/* TITULO Y HORA */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: item.done
                              ? styles.doneText.color
                              : styles.pendingText.color,
                            fontSize: 18,
                          }}
                        >
                          {item.title}
                        </Text>

                        {item.time && (
                          <Text
                            style={{
                              marginTop: 2,
                              fontSize: 13,
                              color: styles.pendingText.color + "AA",
                              opacity: item.done ? 0.45 : 0.85,
                            }}
                          >
                            {item.time}
                          </Text>
                        )}
                      </View>

                      {/* CONTADOR + CHEVRON */}
                      {total > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: 8,
                          }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                              backgroundColor:
                                done === total
                                  ? styles.doneCheck.color + "22"
                                  : styles.pendingCheck.color + "22",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color:
                                  done === total
                                    ? styles.doneCheck.color
                                    : styles.pendingText.color,
                              }}
                            >
                              {done}/{total}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => toggleCollapse(item.id)}
                            style={{ marginLeft: 6 }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons
                              name={collapsedTasks[item.id] ? "chevron-down" : "chevron-up"}
                              size={18}
                              color={styles.pendingText.color}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>             

                {/* Subtareas */}
                {item.subtasks && item.subtasks.length > 0 &&!collapsedTasks[item.id] && (
                  <View style={{ marginLeft: 32, marginTop: 7, marginRight: 3 }}>
                    {item.subtasks.map(sub => (
                      <View
                        key={sub.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 3
                        }}
                      >
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}
                          onPress={() => toggleSubtaskDone(item.id, sub.id)}
                        >
                          <Ionicons
                            name={sub.done ? "checkmark-circle" : "ellipse-outline"}
                            size={20}
                            color={sub.done ? styles.doneCheck.color : styles.pendingCheck.color}
                          />
                          <Text
                            style={{
                              marginLeft: 6,
                              color: sub.done ? styles.doneText.color : styles.pendingText.color,
                            }}
                          >
                            {sub.text}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeSubtask(item.id, sub.id)}>
                          <Ionicons name='trash-outline' size={18} color='red' />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Menú de opciones */}
                {activeTaskId === item.id && (
                  <Animated.View
                    style={[
                      styles.optionMenu,
                      {
                        position: 'absolute',
                        opacity: menuAnimation,
                        transform: [{
                          translateY: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0]
                          })
                        }]
                      }
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setModalTaskId(item.id);
                        setActiveModal("subtask");
                        closeMenu();
                      }}
                      style={{ paddingVertical: 5, flexDirection: 'row' }}
                    >
                      <Ionicons name='add-circle-outline' size={18} color={mode === 'light' ? '#000' : '#fff'} style={{ marginRight: 5 }} />
                      <Text style={{ color: mode === 'light' ? '#000' : '#fff', fontWeight: 'bold' }}>Agregar subtarea</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => { startEditTask(item); closeMenu(); }}
                      style={{ paddingVertical: 5, flexDirection: 'row' }}
                    >
                      <Ionicons name='create-outline' size={18} color={mode === 'light' ? '#000' : '#fff'} style={{ marginRight: 5 }} />
                      <Text style={{ color: mode === 'light' ? '#000' : '#fff', fontWeight: 'bold' }}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => { removeTask(item.id); closeMenu(); }}
                      style={{ paddingVertical: 5, flexDirection: 'row' }}
                    >
                      <Ionicons name='trash-outline' size={18} color='red' style={{ marginRight: 5 }} />
                      <Text style={{ color: 'red', fontWeight: 'bold' }}>Eliminar</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

              </View>
            )}}
          />
        )}
      <ConfirmDialog
        visible={!!confirmFuture}
        themeName={themeName}
        mode={mode}
        title="Tarea futura"
        message="Esta tarea pertenece a un día posterior. ¿Quieres marcarla de todas formas?"
        onCancel={() => setConfirmFuture(null)}
        onConfirm={() => {
          toggleTaskDone(confirmFuture);
          setConfirmFuture(null);
        }}
      />
      </View>
    </TouchableWithoutFeedback>
  );
}
