import TaskList from './TaskList';
import {View} from 'react-native';
import createStyles from '../../tasks/styles/styles';

export default function AllTasks({ tasks, toggleTaskDone, toggleSubtaskDone, removeTask, removeSubtask, themeName, mode, openOptions, closeOptions, activeTaskId, setModalTaskId, startEditTask, setActiveModal}) {
  const styles = createStyles(themeName, mode);
  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <TaskList
      tasks={tasks} 
      toggleTaskDone={toggleTaskDone} 
      toggleSubtaskDone={toggleSubtaskDone}
      removeTask={removeTask} 
      removeSubtask={removeSubtask}
      themeName={themeName} 
      mode={mode}
      openOptions={openOptions} 
      closeOptions={closeOptions} 
      activeTaskId={activeTaskId}
      startEditTask={startEditTask}
      setActiveModal={setActiveModal} 
      setModalTaskId={setModalTaskId}
      />
    </View>
  );
}