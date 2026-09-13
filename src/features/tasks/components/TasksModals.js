import CategoryModal from "@/features/tasks/modals/CategoryModal";
import TaskModal from "@/features/tasks/modals/TaskModal";
import TimeModal from "@/features/tasks/modals/TimeModal";
import SubtaskModal from "@/features/tasks/modals/SubtaskModal";
export default function TasksModals({
  editor,
  actions,
  tasks,
  categories,
  selectedCategory,
  setSelectedCategory,
  themeName,
  mode
}) {
  const {
    selectedCategoryForTask,
    setSelectedCategoryForTask,
    activeModal,
    taskModalVisible,
    taskModalMode,
    taskToEdit,
    modalTaskId,
    categoryModalState,
    setCategoryModalState,
    timeModalVisible,
    setTimeModalVisible,
    schedule,
    handleTimeSelected,
    openAddCategoryFromTask,
    closeTaskModal,
    closeModal
  } = editor;
  const {
    selectedDate,
    selectedTime,
    repeatMode,
    repeatDays,
    repeatInterval,
    reminder,
    endDate
  } = schedule;
  const {
    deleteCategoryHandler,
    addTaskHandler,
    saveEditTaskHandler,
    saveSubtasksHandler,
    saveCategoryHandler
  } = actions;
  return (
    <>
        <TaskModal
          visible={taskModalVisible}
          isSaving={actions.isTaskSaving}
          themeName={themeName}
          mode={mode}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          repeatMode={repeatMode}
          reminder={reminder}
          endDate={endDate}
          taskToEdit={taskModalMode === "edit" ? taskToEdit : null}
          categories={categories.filter((c) => c.id !== "all")}
          selectedCategoryForTask={selectedCategoryForTask}
          clearSelectedCategoryForTask={() => setSelectedCategoryForTask(null)}
          openTimeModal={() => setTimeModalVisible(true)}
          openAddCategoryModal={openAddCategoryFromTask}
          saveTask={async (taskData) => {
            if (taskModalMode === "add") await addTaskHandler(taskData, schedule);
            else if (taskModalMode === "edit") await saveEditTaskHandler(taskData, taskToEdit, schedule);
            setSelectedCategoryForTask(null);
            closeTaskModal();
          }}
          closeModal={() => {
            setSelectedCategoryForTask(null);
            closeTaskModal();
          }}
        />

        <TimeModal
          visible={timeModalVisible}
          themeName={themeName}
          mode={mode}
          onTimeSelected={handleTimeSelected}
          selectedDate={selectedDate}
          selectedTime={selectedTime}

          repeatMode={repeatMode}
          repeatDays={repeatDays}
          repeatInterval={repeatInterval}
          reminder={reminder}
          endDate={endDate}
          closeModal={() => setTimeModalVisible(false)}
        />

        <SubtaskModal
          visible={activeModal === "subtask"}
          isSaving={actions.isSubtaskSaving}
          themeName={themeName}
          mode={mode}
          modalTaskId={modalTaskId}
          subtasks={tasks.find(
              (task) =>
                task.id ===
                modalTaskId
            )?.subtasks || []
          }
          onSave={(draftSubtasks) =>
            saveSubtasksHandler(
              modalTaskId,
              draftSubtasks
            )
          }
          closeModal={closeModal}
        />

        <CategoryModal
          visible={categoryModalState.visible}
          isSaving={actions.isCategorySaving}
          themeName={themeName}
          mode={mode}
          categoryToEdit={categoryModalState.category}
          saveCategory={async (cat) => {
            const saved = await saveCategoryHandler(cat);
            if (!saved) {
              setCategoryModalState({
                visible: false,
                category: null,
                fromTask: false,
              });
              return;
            }

            if (categoryModalState.fromTask) {
              setSelectedCategoryForTask(saved.id);
            }

            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
          deleteCategory={async (id) => {
            await deleteCategoryHandler(id);
            if (selectedCategory === id) {
              setSelectedCategory("all");
            }
            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
          closeModal={() => {
            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
        />
    </>
  );
}
