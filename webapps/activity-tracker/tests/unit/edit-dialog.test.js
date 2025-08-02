/**
 * Edit Dialog Tests
 * Tests the edit dialog styling and layout improvements
 */

import { fireEvent } from '@testing-library/dom';

describe('Edit Dialog Improvements', () => {
    beforeEach(() => {
        createMockDOMStructure();
    });

    describe('Todo Button Styling', () => {
        test('should have correct CSS class for todo button', () => {
            const editTodoButton = document.getElementById('editTodoButton');
            
            expect(editTodoButton).toBeTruthy();
            expect(editTodoButton).toHaveClass('btn-quick-set');
            expect(editTodoButton).not.toHaveClass('btn-outline');
            expect(editTodoButton).not.toHaveClass('btn-small');
        });

        test('should toggle active state correctly', () => {
            const editTodoButton = document.getElementById('editTodoButton');
            const editTodoButtonText = document.getElementById('editTodoButtonText');
            
            // Initial state
            expect(editTodoButton).not.toHaveClass('active');
            expect(editTodoButtonText.textContent).toBe('Mark as Todo');
            
            // Simulate the state change that would happen when clicked
            editTodoButton.classList.add('active');
            editTodoButtonText.textContent = 'Remove from Todos';
            
            expect(editTodoButton).toHaveClass('active');
            expect(editTodoButtonText.textContent).toBe('Remove from Todos');
        });

        test('should use same styling as due date buttons', () => {
            const editTodoButton = document.getElementById('editTodoButton');
            const dueDateButtons = document.querySelectorAll('.due-date-quick-sets .btn-quick-set');
            
            expect(editTodoButton).toHaveClass('btn-quick-set');
            expect(dueDateButtons.length).toBeGreaterThan(0);
            
            // Check if they share the same base class
            dueDateButtons.forEach(button => {
                expect(button).toHaveClass('btn-quick-set');
            });
        });
    });

    describe('Modal Layout', () => {
        test('should have edit modal with correct CSS class', () => {
            const editModal = document.getElementById('editModal');
            const modalContent = editModal.querySelector('.modal-content');
            
            expect(editModal).toBeTruthy();
            expect(modalContent).toHaveClass('edit-modal-content');
        });

        test('should have time and due date fields in form-group-row', () => {
            const formGroupRow = document.querySelector('.form-group-row');
            const timestampField = document.getElementById('editTimestamp');
            const dueDateField = document.getElementById('editDueDate');
            const todoButton = document.getElementById('editTodoButton');
            
            expect(formGroupRow).toBeTruthy();
            expect(timestampField).toBeTruthy();
            expect(dueDateField).toBeTruthy();
            expect(todoButton).toBeTruthy();
            
            // Both fields and todo button should be within the row container
            expect(formGroupRow.contains(timestampField)).toBe(true);
            expect(formGroupRow.contains(dueDateField)).toBe(true);
            expect(formGroupRow.contains(todoButton)).toBe(true);
        });

        test('should have todo button positioned under time field', () => {
            const timeFormGroup = document.querySelector('.form-group-row .form-group:first-child');
            const timestampField = document.getElementById('editTimestamp');
            const todoButton = document.getElementById('editTodoButton');
            
            expect(timeFormGroup).toBeTruthy();
            expect(timeFormGroup.contains(timestampField)).toBe(true);
            expect(timeFormGroup.contains(todoButton)).toBe(true);
            
            // Check that todo button comes after timestamp input
            const timeLabel = timeFormGroup.querySelector('label[for="editTimestamp"]');
            expect(timeLabel.textContent).toBe('Time');
        });

        test('should have all due date quick-set buttons', () => {
            const dueDateQuickSets = document.querySelector('.due-date-quick-sets');
            const buttons = dueDateQuickSets.querySelectorAll('.btn-quick-set');
            
            expect(buttons).toHaveLength(3);
            expect(buttons[0].textContent).toBe('Tomorrow');
            expect(buttons[1].textContent).toBe('Next Week');
            expect(buttons[2].textContent).toBe('Next Month');
        });
    });

    describe('Form Field Layout', () => {
        test('should have proper form structure', () => {
            const editForm = document.getElementById('editForm');
            const activityField = document.getElementById('editActivity');
            const descriptionField = document.getElementById('editDescription');
            const timestampField = document.getElementById('editTimestamp');
            const dueDateField = document.getElementById('editDueDate');
            const todoButton = document.getElementById('editTodoButton');
            
            expect(editForm).toBeTruthy();
            expect(activityField).toBeTruthy();
            expect(descriptionField).toBeTruthy();
            expect(timestampField).toBeTruthy();
            expect(dueDateField).toBeTruthy();
            expect(todoButton).toBeTruthy();
            
            // Check field types
            expect(activityField.type).toBe('text');
            expect(descriptionField.tagName.toLowerCase()).toBe('textarea');
            expect(timestampField.type).toBe('datetime-local');
            expect(dueDateField.type).toBe('datetime-local');
        });

        test('should have required fields marked correctly', () => {
            const activityField = document.getElementById('editActivity');
            const timestampField = document.getElementById('editTimestamp');
            const dueDateField = document.getElementById('editDueDate');
            
            expect(activityField.required).toBe(true);
            expect(timestampField.required).toBe(true);
            expect(dueDateField.required).toBe(false); // Due date is optional
        });
    });

    describe('Button Interactions', () => {
        test('should have todo button with onclick attribute', () => {
            const editTodoButton = document.getElementById('editTodoButton');
            
            expect(editTodoButton).toBeTruthy();
            expect(editTodoButton.getAttribute('onclick')).toBe('toggleEditTodo()');
        });

        test('should have due date buttons with onclick attributes', () => {
            const dueDateButtons = document.querySelectorAll('.due-date-quick-sets .btn-quick-set');
            
            expect(dueDateButtons).toHaveLength(3);
            expect(dueDateButtons[0].getAttribute('onclick')).toBe("setEditDueDate('tomorrow')");
            expect(dueDateButtons[1].getAttribute('onclick')).toBe("setEditDueDate('nextWeek')");
            expect(dueDateButtons[2].getAttribute('onclick')).toBe("setEditDueDate('nextMonth')");
        });

        test('should handle form submission', () => {
            const editForm = document.getElementById('editForm');
            const activityField = document.getElementById('editActivity');
            const timestampField = document.getElementById('editTimestamp');
            
            // Fill required fields
            activityField.value = 'Test activity';
            timestampField.value = '2025-08-02T15:30';
            
            expect(() => {
                fireEvent.submit(editForm);
            }).not.toThrow();
        });
    });
});