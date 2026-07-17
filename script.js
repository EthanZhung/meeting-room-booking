document.addEventListener('DOMContentLoaded', () => {

    /**
     * 主要應用程式模組
     */
    const App = {
        state: {
            reservations: [],
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            selectedDate: null,
            isLoading: false,
            reservationDataLoaded: false,
            queriedEmail: '',
            pendingCancellation: null,
            cancelDialogTrigger: null,
        },

        config: {
            GAS_URL: "https://script.google.com/macros/s/AKfycbyU9sUdpf2kZ2Ju8hznItnaoEYN8nwWamcOt75Vsrmznt6fvNWYpTOnorhQ2xasCNp_/exec",
        },

        elements: {
            reservationForm: document.getElementById('reservationForm'),
            timeSelect: document.getElementById('time'),
            durationSelect: document.getElementById('duration'),
            reservationTimeDiv: document.getElementById('reservationTime'),
            dateInput: document.getElementById('date'),
            unitInput: document.getElementById('unit'),
            meetingNameInput: document.getElementById('meetingName'),
            nameInput: document.getElementById('name'),
            emailInput: document.getElementById('email'),
            submitButton: document.querySelector('#reservationForm button[type="submit"]'),
            submitButtonLabel: document.querySelector('#reservationForm button[type="submit"] .button__label'),
            resetButton: document.getElementById('resetButton'),
            formAlert: document.getElementById('formAlert'),
            formAlertTitle: document.getElementById('formAlertTitle'),
            formAlertMessage: document.getElementById('formAlertMessage'),
            successPanel: document.getElementById('successPanel'),
            successDate: document.getElementById('successDate'),
            successTime: document.getElementById('successTime'),
            successMeetingName: document.getElementById('successMeetingName'),
            summaryEmpty: document.getElementById('summaryEmpty'),
            summaryDetails: document.getElementById('summaryDetails'),
            summaryDate: document.getElementById('summaryDate'),
            summaryTime: document.getElementById('summaryTime'),
            summaryMeetingName: document.getElementById('summaryMeetingName'),
            summaryApplicant: document.getElementById('summaryApplicant'),
            pageStatus: document.getElementById('pageStatus'),
            calendarContainer: document.getElementById('calendar'),
            yearSelect: document.getElementById('yearSelect'),
            monthSelect: document.getElementById('monthSelect'),
            reservedSlotsDiv: document.getElementById('reservedSlots'),
            cancelForm: document.getElementById('cancelForm'),
            cancelEmailInput: document.getElementById('cancelEmailInput'),
            userReservationsDiv: document.getElementById('userReservations'),
            // 【全新加入】定義查詢頁面的提交按鈕
            cancelSubmitButton: document.querySelector('#cancelForm button[type="submit"]'),
            cancelSubmitButtonLabel: document.querySelector('#cancelForm button[type="submit"] .button__label'),
            cancelEmailError: document.getElementById('cancelEmailError'),
            cancelPageAlert: document.getElementById('cancelPageAlert'),
            cancelPageAlertTitle: document.getElementById('cancelPageAlertTitle'),
            cancelPageAlertMessage: document.getElementById('cancelPageAlertMessage'),
            retryReservationsButton: document.getElementById('retryReservationsButton'),
            cancelSuccessAlert: document.getElementById('cancelSuccessAlert'),
            cancelSuccessMessage: document.getElementById('cancelSuccessMessage'),
            resultCount: document.getElementById('resultCount'),
            cancelPageStatus: document.getElementById('cancelPageStatus'),
            cancelDialog: document.getElementById('cancelDialog'),
            cancelDialogClose: document.getElementById('cancelDialogClose'),
            confirmCancelButton: document.getElementById('confirmCancelButton'),
            confirmCancelButtonLabel: document.querySelector('#confirmCancelButton .button__label'),
            dialogMeetingName: document.getElementById('dialogMeetingName'),
            dialogDate: document.getElementById('dialogDate'),
            dialogTime: document.getElementById('dialogTime'),
        },

        init() {
            if (!this.config.GAS_URL) {
                console.warn("GAS_URL 尚未設定。系統將無法與後端溝通。");
                alert("系統設定不完整，請聯絡管理員。");
            }
            this.bindEvents();
            this.render();
        },

        bindEvents() {
            if (this.elements.reservationForm) {
                this.elements.reservationForm.addEventListener('submit', this.handlers.handleReservationSubmit.bind(this));
                this.elements.reservationForm.addEventListener('reset', this.handlers.handleFormReset.bind(this));
                this.elements.resetButton.addEventListener('click', () => this.ui.hideSuccess());

                [
                    this.elements.unitInput,
                    this.elements.meetingNameInput,
                    this.elements.nameInput,
                    this.elements.emailInput,
                ].forEach(input => {
                    input.addEventListener('input', event => {
                        this.ui.clearFieldError(event.target.id);
                        this.ui.updateBookingSummary();
                    });
                });

                this.elements.dateInput.addEventListener('change', this.handlers.handleDateInputChange.bind(this));
                this.elements.dateInput.addEventListener('click', this.handlers.handleDatePickerOpen.bind(this));
                this.elements.timeSelect.addEventListener('change', event => {
                    this.ui.clearFieldError(event.target.id);
                    this.render('reservationTime');
                    this.ui.updateBookingSummary();
                });
                this.elements.durationSelect.addEventListener('change', event => {
                    this.ui.clearFieldError(event.target.id);
                    this.render('reservationTime');
                    this.ui.updateBookingSummary();
                });
            }

            if (this.elements.calendarContainer) {
                this.elements.yearSelect.addEventListener('change', this.handlers.handleYearChange.bind(this));
                this.elements.monthSelect.addEventListener('change', this.handlers.handleMonthChange.bind(this));
                this.elements.calendarContainer.addEventListener('click', this.handlers.handleDateClick.bind(this));
            }

            if (this.elements.cancelForm) {
                this.elements.cancelForm.addEventListener('submit', this.handlers.handleCancelQuery.bind(this));
                this.elements.userReservationsDiv.addEventListener('click', this.handlers.handleCancelClick.bind(this));
                this.elements.cancelEmailInput.addEventListener('input', () => {
                    this.ui.clearCancelEmailError();
                    this.ui.hideCancelSuccess();
                });
                this.elements.retryReservationsButton.addEventListener('click', this.handlers.handleCancelRetry.bind(this));
                this.elements.cancelDialogClose.addEventListener('click', () => this.ui.closeCancelDialog(true));
                this.elements.confirmCancelButton.addEventListener('click', this.handlers.handleCancelConfirm.bind(this));
                this.elements.cancelDialog.addEventListener('close', () => {
                    if (!this.state.isLoading) this.state.pendingCancellation = null;
                });
                this.elements.cancelDialog.addEventListener('cancel', event => {
                    if (this.state.isLoading) event.preventDefault();
                });
            }
        },

        async render(component = null) {
            if (this.elements.reservationForm && !component) {
                this.ui.populateYearSelect();
                this.elements.monthSelect.value = this.state.currentMonth;
                this.ui.setMinDate();
                this.ui.updateReservationTime();
                this.ui.updateBookingSummary();
                await this.fetchData();
            } else if (this.elements.cancelForm && !component) {
                await this.fetchData();
            }

            if (component === 'calendar') this.ui.generateCalendar();
            if (component === 'reservationTime') this.ui.updateReservationTime();
        },

        async fetchData() {
            const loadingMessage = this.elements.cancelForm
                ? '正在載入預約資料…'
                : '正在載入可用時段…';
            this.ui.setLoading(true, loadingMessage);
            try {
                const data = await apiService.getReservations(this.config.GAS_URL);
                if (Array.isArray(data)) {
                    this.state.reservations = data;
                    this.state.reservationDataLoaded = true;
                    if (this.elements.reservationForm) {
                        this.ui.hideFormAlert();
                    }
                    if (this.elements.cancelForm) {
                        this.ui.hideCancelAlert();
                        if (!this.state.queriedEmail) this.ui.renderCancelInitialState();
                    }
                } else {
                    // 如果後端回傳錯誤物件，則清空資料並顯示錯誤
                    this.state.reservations = [];
                    throw new Error(data.message || '回傳資料格式不正確');
                }
                if (this.elements.calendarContainer) this.ui.generateCalendar();
            } catch (error) {
                console.error("獲取預約資料失敗:", error);
                this.state.reservationDataLoaded = false;
                if (this.elements.reservationForm) {
                    this.ui.showFormAlert(
                        '無法載入預約資料',
                        `目前無法確認會議室可用時段：${error.message}`,
                        false
                    );
                } else if (this.elements.cancelForm) {
                    this.ui.showCancelAlert(
                        '無法載入預約資料',
                        '目前無法取得預約紀錄，請重新載入後再查詢。',
                        true
                    );
                    this.ui.renderCancelUnavailableState();
                }
            } finally {
                this.ui.setLoading(false);
            }

            return this.state.reservationDataLoaded;
        },

        handlers: {
            handleDatePickerOpen(event) {
                const dateInput = event.currentTarget;
                if (typeof dateInput.showPicker !== 'function') return;

                try {
                    dateInput.showPicker();
                } catch (error) {
                    if (!['InvalidStateError', 'NotAllowedError'].includes(error.name)) {
                        console.warn('無法開啟日期選擇器：', error);
                    }
                }
            },

            async handleReservationSubmit(event) {
                event.preventDefault();
                if (this.state.isLoading) return;

                this.ui.clearFormFeedback();
                this.ui.hideSuccess();

                const newReservation = {
                    unit: this.elements.unitInput.value.trim(),
                    meetingName: this.elements.meetingNameInput.value.trim(),
                    name: this.elements.nameInput.value.trim(),
                    email: this.elements.emailInput.value.trim(),
                    date: this.elements.dateInput.value,
                    time: this.elements.timeSelect.value,
                    duration: parseFloat(this.elements.durationSelect.value)
                };

                const validationErrors = this.ui.validateReservationForm(newReservation);
                if (validationErrors.length > 0) {
                    this.ui.showValidationErrors(validationErrors);
                    return;
                }

                if (logic.checkLunchBreakConflict(newReservation.time, newReservation.duration)) {
                    const message = '您選擇的預約時間與午休時間（12:30–13:30）重疊，請重新選擇。';
                    this.ui.showFieldError('time', message);
                    this.ui.showFormAlert('預約時段無法使用', message);
                    return;
                }
                if (logic.isTimeSlotBooked(this.state.reservations, newReservation.date, newReservation.time, newReservation.duration)) {
                    const { endTime } = logic.calculateTimeDetails(newReservation.time, newReservation.duration);
                    const message = `您選擇的 ${newReservation.time}–${endTime} 已與既有預約重疊，請選擇其他時段。`;
                    this.ui.showFieldError('time', message);
                    this.ui.showFormAlert('此時段已被預約', message);
                    return;
                }

                this.ui.setLoading(true, "預約處理中…");
                try {
                    const result = await apiService.addReservation(this.config.GAS_URL, newReservation);
                    if (result.status === "success") {
                        this.elements.reservationForm.reset();
                        this.ui.showSuccess(newReservation);
                        await this.fetchData();
                        this.elements.successPanel?.focus();
                    } else {
                        throw new Error(result.message || "後端回傳未知錯誤");
                    }
                } catch (error) {
                    console.error("新增預約失敗:", error);
                    this.ui.showFormAlert('預約未完成', `系統無法完成預約：${error.message}`);
                } finally {
                    this.ui.setLoading(false);
                }
            },

            handleFormReset() {
                window.setTimeout(() => {
                    this.state.selectedDate = null;
                    this.ui.clearFormFeedback();
                    this.ui.updateReservationTime();
                    this.ui.updateBookingSummary();
                    this.ui.generateCalendar();
                    this.ui.showReservedSlots(null);
                }, 0);
            },

            handleDateInputChange(event) {
                const date = event.target.value;
                this.ui.clearFieldError('date');
                this.state.selectedDate = date || null;

                if (date) {
                    const [year, month] = date.split('-').map(Number);
                    this.state.currentYear = year;
                    this.state.currentMonth = month - 1;
                    this.elements.yearSelect.value = year;
                    this.elements.monthSelect.value = month - 1;
                    this.ui.showReservedSlots(date);
                } else {
                    this.ui.showReservedSlots(null);
                }

                this.ui.generateCalendar();
                this.ui.updateBookingSummary();
            },

            handleYearChange(event) {
                this.state.currentYear = parseInt(event.target.value);
                this.render('calendar');
            },

            handleMonthChange(event) {
                this.state.currentMonth = parseInt(event.target.value);
                this.render('calendar');
            },

            handleDateClick(event) {
                const dayElement = event.target.closest('.day:not(.empty)');
                if (dayElement) {
                    const date = dayElement.dataset.date;
                    this.state.selectedDate = date;
                    this.elements.dateInput.value = date;
                    this.ui.clearFieldError('date');
                    this.ui.showReservedSlots(date);
                    this.ui.generateCalendar();
                    this.ui.updateBookingSummary();
                }
            },

            handleCancelQuery(event) {
                event.preventDefault();
                if (this.state.isLoading) return;

                const email = this.elements.cancelEmailInput.value.trim();
                this.ui.clearCancelEmailError();
                this.ui.hideCancelSuccess();

                if (!this.state.reservationDataLoaded) {
                    this.ui.showCancelAlert(
                        '尚未載入預約資料',
                        '請先重新載入預約資料，再進行查詢。',
                        true
                    );
                    return;
                }

                if (!email) {
                    this.ui.showCancelEmailError('請輸入電子郵件。');
                    return;
                }

                if (!this.elements.cancelEmailInput.validity.valid) {
                    this.ui.showCancelEmailError('電子郵件格式不正確，請輸入 name@example.com。');
                    return;
                }

                this.state.queriedEmail = email;
                this.ui.hideCancelAlert();
                this.ui.renderUserReservations(email);
            },

            handleCancelClick(event) {
                const cancelButton = event.target.closest('.cancel-btn');
                if (!cancelButton || this.state.isLoading) return;

                const reservationId = cancelButton.dataset.id;
                const reservation = this.state.reservations.find(res => String(res.id) === String(reservationId));
                if (!reservation) {
                    this.ui.showCancelAlert(
                        '找不到這筆預約',
                        '預約資料可能已更新，請重新載入後再試一次。',
                        true
                    );
                    return;
                }

                this.state.pendingCancellation = reservation;
                this.state.cancelDialogTrigger = cancelButton;
                this.ui.openCancelDialog(reservation);
            },

            async handleCancelConfirm() {
                const reservation = this.state.pendingCancellation;
                if (!reservation || this.state.isLoading) return;

                this.ui.setLoading(true, '取消處理中…');
                try {
                    const result = await apiService.deleteReservation(this.config.GAS_URL, reservation.id);
                    if (result.status !== "success") {
                        throw new Error(result.message || "後端回傳未知錯誤");
                    }

                    this.ui.closeCancelDialog(false);
                    this.ui.showCancelSuccess(reservation);
                    const currentEmail = this.elements.cancelEmailInput.value.trim();
                    await this.fetchData();
                    if (this.state.reservationDataLoaded) {
                        this.state.queriedEmail = currentEmail;
                        this.ui.renderUserReservations(currentEmail);
                    }
                } catch (error) {
                    console.error("取消預約失敗:", error);
                    this.ui.closeCancelDialog(false);
                    this.ui.showCancelAlert(
                        '無法取消預約',
                        '系統目前無法完成取消，您的預約可能仍然有效。請稍後再試。',
                        false
                    );
                } finally {
                    this.ui.setLoading(false);
                    this.state.pendingCancellation = null;
                    this.state.cancelDialogTrigger = null;
                }
            },

            async handleCancelRetry() {
                if (this.state.isLoading) return;
                const loaded = await this.fetchData();
                if (loaded && this.state.queriedEmail) {
                    this.ui.renderUserReservations(this.state.queriedEmail);
                }
            }
        },

        ui: {
            setLoading(isLoading, message = "確認預約") {
                App.state.isLoading = isLoading;

                // 控制預約頁面的操作狀態
                if (App.elements.submitButton) {
                    App.elements.submitButton.disabled = isLoading;
                    App.elements.submitButton.classList.toggle('is-loading', isLoading);
                    App.elements.submitButton.setAttribute('aria-busy', String(isLoading));
                    if (App.elements.submitButtonLabel) {
                        App.elements.submitButtonLabel.textContent = isLoading ? message : "確認預約";
                    }
                }

                if (App.elements.resetButton) {
                    App.elements.resetButton.disabled = isLoading;
                }

                if (App.elements.reservationForm) {
                    App.elements.reservationForm.setAttribute('aria-busy', String(isLoading));
                }

                // 同時控制查詢頁面的按鈕和輸入框
                if (App.elements.cancelSubmitButton) {
                    App.elements.cancelSubmitButton.disabled = isLoading;
                    App.elements.cancelSubmitButton.classList.toggle('is-loading', isLoading);
                    App.elements.cancelSubmitButton.setAttribute('aria-busy', String(isLoading));
                    if (App.elements.cancelSubmitButtonLabel) {
                        App.elements.cancelSubmitButtonLabel.textContent = isLoading ? message : '查詢預約';
                    }
                }

                if (App.elements.cancelEmailInput) {
                    App.elements.cancelEmailInput.disabled = isLoading;
                }

                if (App.elements.cancelForm) {
                    App.elements.cancelForm.setAttribute('aria-busy', String(isLoading));
                }

                if (App.elements.userReservationsDiv) {
                    App.elements.userReservationsDiv.setAttribute('aria-busy', String(isLoading));
                }

                if (App.elements.confirmCancelButton) {
                    App.elements.confirmCancelButton.disabled = isLoading;
                    App.elements.confirmCancelButton.classList.toggle('is-loading', isLoading);
                    App.elements.confirmCancelButton.setAttribute('aria-busy', String(isLoading));
                    if (App.elements.confirmCancelButtonLabel) {
                        App.elements.confirmCancelButtonLabel.textContent = isLoading ? message : '確認取消';
                    }
                }

                if (App.elements.cancelDialogClose) {
                    App.elements.cancelDialogClose.disabled = isLoading;
                }

                App.elements.calendarContainer?.classList.toggle('loading', isLoading);
                if (App.elements.pageStatus) {
                    App.elements.pageStatus.textContent = isLoading ? message : '';
                }
                if (App.elements.cancelPageStatus) {
                    App.elements.cancelPageStatus.textContent = isLoading ? message : '';
                }
            },

            validateReservationForm(reservation) {
                const errors = [];
                const requiredFields = [
                    ['unit', reservation.unit, '請填寫申請單位。'],
                    ['meetingName', reservation.meetingName, '請填寫會議名稱。'],
                    ['name', reservation.name, '請填寫姓名。'],
                    ['email', reservation.email, '請填寫電子郵件。'],
                    ['date', reservation.date, '請選擇預約日期。'],
                    ['time', reservation.time, '請選擇開始時間。'],
                ];

                requiredFields.forEach(([fieldId, value, message]) => {
                    if (!value) errors.push({ fieldId, message });
                });

                if (reservation.email && !App.elements.emailInput.validity.valid) {
                    errors.push({ fieldId: 'email', message: '電子郵件格式不正確，請重新確認。' });
                }

                if (reservation.date && !App.elements.dateInput.validity.valid) {
                    errors.push({ fieldId: 'date', message: '預約日期不可早於今天。' });
                }

                return errors;
            },

            showValidationErrors(errors) {
                errors.forEach(error => this.showFieldError(error.fieldId, error.message));
                this.showFormAlert(
                    '請檢查預約資料',
                    `共有 ${errors.length} 個欄位需要修正，請依欄位提示完成填寫。`
                );
            },

            showFieldError(fieldId, message) {
                const field = document.getElementById(fieldId);
                const errorElement = document.getElementById(`${fieldId}Error`);
                if (!field || !errorElement) return;

                field.setAttribute('aria-invalid', 'true');
                errorElement.textContent = message;
                errorElement.hidden = false;
            },

            clearFieldError(fieldId) {
                const field = document.getElementById(fieldId);
                const errorElement = document.getElementById(`${fieldId}Error`);
                if (!field || !errorElement) return;

                field.removeAttribute('aria-invalid');
                errorElement.textContent = '';
                errorElement.hidden = true;
            },

            clearFormFeedback() {
                ['unit', 'meetingName', 'name', 'email', 'date', 'time', 'duration']
                    .forEach(fieldId => this.clearFieldError(fieldId));
                this.hideFormAlert();
            },

            showFormAlert(title, message, shouldFocus = true) {
                const { formAlert, formAlertTitle, formAlertMessage } = App.elements;
                if (!formAlert || !formAlertTitle || !formAlertMessage) return;

                formAlertTitle.textContent = title;
                formAlertMessage.textContent = message;
                formAlert.hidden = false;
                if (shouldFocus) formAlert.focus();
            },

            hideFormAlert() {
                if (!App.elements.formAlert) return;
                App.elements.formAlert.hidden = true;
                App.elements.formAlertMessage.textContent = '';
            },

            showSuccess(reservation) {
                const { endTime } = logic.calculateTimeDetails(reservation.time, reservation.duration);
                App.elements.successDate.textContent = this.formatDate(reservation.date);
                App.elements.successTime.textContent = `${reservation.time}–${endTime}`;
                App.elements.successMeetingName.textContent = reservation.meetingName;
                App.elements.successPanel.hidden = false;
            },

            hideSuccess() {
                if (App.elements.successPanel) App.elements.successPanel.hidden = true;
            },

            showCancelEmailError(message) {
                const { cancelEmailInput, cancelEmailError } = App.elements;
                if (!cancelEmailInput || !cancelEmailError) return;

                cancelEmailInput.setAttribute('aria-invalid', 'true');
                cancelEmailError.textContent = message;
                cancelEmailError.hidden = false;
                cancelEmailInput.focus();
            },

            clearCancelEmailError() {
                const { cancelEmailInput, cancelEmailError } = App.elements;
                if (!cancelEmailInput || !cancelEmailError) return;

                cancelEmailInput.removeAttribute('aria-invalid');
                cancelEmailError.textContent = '';
                cancelEmailError.hidden = true;
            },

            showCancelAlert(title, message, showRetry = false, shouldFocus = true) {
                const {
                    cancelPageAlert,
                    cancelPageAlertTitle,
                    cancelPageAlertMessage,
                    retryReservationsButton,
                } = App.elements;
                if (!cancelPageAlert) return;

                cancelPageAlertTitle.textContent = title;
                cancelPageAlertMessage.textContent = message;
                retryReservationsButton.hidden = !showRetry;
                cancelPageAlert.hidden = false;
                if (shouldFocus) cancelPageAlert.focus();
            },

            hideCancelAlert() {
                if (!App.elements.cancelPageAlert) return;
                App.elements.cancelPageAlert.hidden = true;
                App.elements.cancelPageAlertMessage.textContent = '';
                App.elements.retryReservationsButton.hidden = true;
            },

            showCancelSuccess(reservation) {
                const { endTime } = logic.calculateTimeDetails(reservation.time, reservation.duration);
                App.elements.cancelSuccessMessage.textContent =
                    `${reservation.meetingName}（${this.formatDate(reservation.date)} ${reservation.time}–${endTime}）已取消。`;
                App.elements.cancelSuccessAlert.hidden = false;
                App.elements.cancelSuccessAlert.focus();
            },

            hideCancelSuccess() {
                if (!App.elements.cancelSuccessAlert) return;
                App.elements.cancelSuccessAlert.hidden = true;
                App.elements.cancelSuccessMessage.textContent = '';
            },

            openCancelDialog(reservation) {
                const { endTime } = logic.calculateTimeDetails(reservation.time, reservation.duration);
                App.elements.dialogMeetingName.textContent = reservation.meetingName || '未命名會議';
                App.elements.dialogDate.textContent = this.formatDate(reservation.date);
                App.elements.dialogTime.textContent = `${reservation.time}–${endTime}`;
                App.elements.cancelDialog.showModal();
                App.elements.cancelDialogClose.focus();
            },

            closeCancelDialog(restoreFocus) {
                if (!App.elements.cancelDialog?.open) return;
                App.elements.cancelDialog.close();
                if (restoreFocus && App.state.cancelDialogTrigger?.isConnected) {
                    App.state.cancelDialogTrigger.focus();
                }
            },

            formatDate(date) {
                if (!date) return '—';
                const parsedDate = new Date(`${date}T00:00:00`);
                return new Intl.DateTimeFormat('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                }).format(parsedDate);
            },

            updateBookingSummary() {
                const { dateInput, timeSelect, durationSelect } = App.elements;
                if (!App.elements.summaryEmpty || !dateInput || !timeSelect || !durationSelect) return;

                const date = dateInput.value;
                const time = timeSelect.value;
                const duration = parseFloat(durationSelect.value);
                const hasSchedule = Boolean(date && time && Number.isFinite(duration));

                App.elements.summaryEmpty.hidden = hasSchedule;
                App.elements.summaryDetails.hidden = !hasSchedule;

                if (!hasSchedule) return;

                const { endTime } = logic.calculateTimeDetails(time, duration);
                App.elements.summaryDate.textContent = this.formatDate(date);
                App.elements.summaryTime.textContent = `${time}–${endTime}`;
                App.elements.summaryMeetingName.textContent = App.elements.meetingNameInput.value.trim() || '尚未填寫';
                App.elements.summaryApplicant.textContent = App.elements.nameInput.value.trim() || '尚未填寫';
            },

            populateYearSelect() {
                const yearSelect = App.elements.yearSelect;
                const currentYearValue = new Date().getFullYear();
                yearSelect.innerHTML = '';
                for (let year = currentYearValue - 5; year <= currentYearValue + 5; year++) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearSelect.appendChild(option);
                }
                yearSelect.value = App.state.currentYear;
            },

            generateCalendar() {
                const { currentYear, currentMonth, reservations, selectedDate } = App.state;
                const calendarElement = App.elements.calendarContainer;
                if (!calendarElement) return;

                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                const today = new Date();
                const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                let html = '<div class="weekdays" role="columnheader">一</div><div class="weekdays" role="columnheader">二</div><div class="weekdays" role="columnheader">三</div><div class="weekdays" role="columnheader">四</div><div class="weekdays" role="columnheader">五</div><div class="weekdays" role="columnheader">六</div><div class="weekdays" role="columnheader">日</div>';

                const firstDayOfWeek = (firstDay.getDay() === 0) ? 6 : firstDay.getDay() - 1;
                for (let i = 0; i < firstDayOfWeek; i++) {
                    html += '<div class="day empty" aria-hidden="true"></div>';
                }

                for (let day = 1; day <= lastDay.getDate(); day++) {
                    const currentDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isBooked = reservations.some(res => res.date === currentDate);
                    const isSelected = selectedDate === currentDate;
                    const isToday = todayString === currentDate;
                    const classNames = ['day'];
                    if (isBooked) classNames.push('booked');
                    if (isSelected) classNames.push('selected');
                    if (isToday) classNames.push('today');
                    const statusText = [
                        isToday ? '今天' : '',
                        isSelected ? '已選擇' : '',
                        isBooked ? '有已預約時段' : '尚無預約',
                    ].filter(Boolean).join('，');
                    const accessibleDate = this.formatDate(currentDate);

                    html += `<button type="button" class="${classNames.join(' ')}" data-date="${currentDate}" aria-label="${accessibleDate}，${statusText}" aria-pressed="${isSelected}">${day}</button>`;
                }
                calendarElement.innerHTML = html;
            },

            showReservedSlots(date) {
                const { reservations } = App.state;
                const reservedSlotsDiv = App.elements.reservedSlotsDiv;
                if (!reservedSlotsDiv) return;

                reservedSlotsDiv.textContent = '';

                if (!date) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state empty-state--compact';
                    const message = document.createElement('p');
                    message.textContent = '選擇日期後顯示已預約時段。';
                    emptyState.appendChild(message);
                    reservedSlotsDiv.appendChild(emptyState);
                    return;
                }

                const reservedThisDate = reservations.filter(res => res.date === date);

                if (reservedThisDate.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state empty-state--compact';
                    const message = document.createElement('p');
                    message.textContent = `${this.formatDate(date)}目前尚無預約。`;
                    emptyState.appendChild(message);
                    reservedSlotsDiv.appendChild(emptyState);
                    return;
                }

                reservedThisDate.sort((a, b) => a.time.localeCompare(b.time));
                reservedThisDate.forEach(res => {
                    const { endTime } = logic.calculateTimeDetails(res.time, res.duration);
                    const meetingName = String(res.meetingName ?? '').trim() || '未命名會議';
                    const maskedName = logic.maskReservationName(res.name);
                    const slot = document.createElement('article');
                    slot.className = 'reserved-slot';
                    const time = document.createElement('strong');
                    time.className = 'reserved-slot__time';
                    time.textContent = `${res.time}–${endTime}`;
                    const details = document.createElement('div');
                    details.className = 'reserved-slot__details';
                    const meeting = document.createElement('span');
                    meeting.className = 'reserved-slot__meeting';
                    meeting.textContent = meetingName;
                    const reserver = document.createElement('span');
                    reserver.className = 'reserved-slot__reserver';
                    reserver.textContent = `預約者：${maskedName}`;
                    details.append(meeting, reserver);
                    slot.append(time, details);
                    reservedSlotsDiv.appendChild(slot);
                });
            },

            renderUserReservations(email) {
                const { reservations } = App.state;
                const userReservationsDiv = App.elements.userReservationsDiv;
                // 【關鍵修正】
                // 在比對前，將使用者的輸入和資料庫中的 email 都轉換為小寫並去除空白。
                // 如此一來，無論大小寫或前後是否有空格，都能正確匹配。
                const userReservations = reservations.filter(res => {
                    // 防呆設計：確保 res.email 存在且為字串，避免對 null 或 undefined 操作
                    const dbEmail = res.email ? res.email.trim().toLowerCase() : '';
                    const inputEmail = email.trim().toLowerCase();
                    return dbEmail === inputEmail;
                });

                userReservationsDiv.replaceChildren();
                App.elements.resultCount.hidden = false;
                App.elements.resultCount.textContent = `${userReservations.length} 筆`;

                if (userReservations.length === 0) {
                    this.renderCancelEmptyState(
                        '查無預約',
                        '沒有找到與此電子郵件相符的預約，請確認輸入內容。'
                    );
                    return;
                }

                const resultList = document.createElement('div');
                resultList.className = 'reservation-list';

                userReservations.forEach(res => {
                    const { endTime } = logic.calculateTimeDetails(res.time, res.duration);
                    const item = document.createElement('article');
                    item.className = 'reservation-item';

                    const content = document.createElement('div');
                    content.className = 'reservation-item__content';

                    const title = document.createElement('h3');
                    title.textContent = res.meetingName || '未命名會議';

                    const details = document.createElement('dl');
                    details.className = 'reservation-item__details';
                    [
                        ['日期', this.formatDate(res.date)],
                        ['時段', `${res.time}–${endTime}`],
                        ['會議室', '服務大樓 405'],
                        ['申請人', res.name || '—'],
                    ].forEach(([label, value]) => {
                        const detail = document.createElement('div');
                        const term = document.createElement('dt');
                        const description = document.createElement('dd');
                        term.textContent = label;
                        description.textContent = value;
                        detail.append(term, description);
                        details.appendChild(detail);
                    });

                    const cancelButton = document.createElement('button');
                    cancelButton.className = 'button button--danger-outline cancel-btn';
                    cancelButton.type = 'button';
                    cancelButton.dataset.id = res.id;
                    cancelButton.textContent = '取消預約';
                    cancelButton.setAttribute(
                        'aria-label',
                        `取消 ${title.textContent}，${this.formatDate(res.date)} ${res.time}–${endTime}`
                    );

                    content.append(title, details);
                    item.append(content, cancelButton);
                    resultList.appendChild(item);
                });
                userReservationsDiv.appendChild(resultList);
            },

            renderCancelEmptyState(title, message) {
                const container = App.elements.userReservationsDiv;
                container.replaceChildren();

                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state cancel-empty-state';
                const icon = document.createElement('span');
                icon.className = 'empty-state__icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = '○';
                const heading = document.createElement('h3');
                heading.textContent = title;
                const description = document.createElement('p');
                description.textContent = message;
                emptyState.append(icon, heading, description);
                container.appendChild(emptyState);
            },

            renderCancelInitialState() {
                if (!App.elements.userReservationsDiv) return;
                App.elements.resultCount.hidden = true;
                this.renderCancelEmptyState(
                    '尚未查詢',
                    '輸入電子郵件並選擇「查詢預約」後，結果會顯示在這裡。'
                );
            },

            renderCancelUnavailableState() {
                if (!App.elements.userReservationsDiv) return;
                App.elements.resultCount.hidden = true;
                this.renderCancelEmptyState(
                    '預約資料無法使用',
                    '重新載入資料後，即可查詢與管理預約。'
                );
            },

            updateReservationTime() {
                const { timeSelect, durationSelect, reservationTimeDiv } = App.elements;
                if (!timeSelect || !durationSelect || !reservationTimeDiv) return;
                const selectedTime = timeSelect.value;
                const selectedDuration = parseFloat(durationSelect.value);

                if (selectedTime) {
                    const { endTime } = logic.calculateTimeDetails(selectedTime, selectedDuration);
                    reservationTimeDiv.textContent = `申請時段：${selectedTime}–${endTime}`;
                    reservationTimeDiv.classList.add('has-value');
                } else {
                    reservationTimeDiv.textContent = '選擇開始時間後顯示完整時段。';
                    reservationTimeDiv.classList.remove('has-value');
                }
            },

            setMinDate() {
                App.elements.dateInput?.setAttribute('min', new Date().toISOString().split('T')[0]);
            }
        }
    };

    const logic = {
        maskReservationName(name) {
            const characters = Array.from(String(name ?? '').trim());
            if (characters.length === 0) return '未知姓名';
            if (characters.length === 1) return '○';
            if (characters.length === 2) return `${characters[0]}○`;

            return `${characters[0]}${'○'.repeat(characters.length - 2)}${characters.at(-1)}`;
        },

        calculateTimeDetails(startTime, duration) {
            const startHour = parseInt(startTime.split(':')[0]);
            const startMinute = parseInt(startTime.split(':')[1]);
            const durationMinutes = duration * 60;
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = startTotalMinutes + durationMinutes;
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinute = endTotalMinutes % 60;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
            return { endTime, startTotalMinutes, endTotalMinutes };
        },

        isTimeSlotBooked(reservations, date, time, duration) {
            const { startTotalMinutes: newStart, endTotalMinutes: newEnd } = this.calculateTimeDetails(time, duration);
            return reservations.some(res => {
                if (res.date !== date) return false;
                const { startTotalMinutes: existingStart, endTotalMinutes: existingEnd } = this.calculateTimeDetails(res.time, res.duration);
                return newStart < existingEnd && newEnd > existingStart;
            });
        },

        checkLunchBreakConflict(time, duration) {
            const { startTotalMinutes, endTotalMinutes } = this.calculateTimeDetails(time, duration);
            const lunchStart = 12 * 60 + 30;
            const lunchEnd = 13 * 60 + 30;
            return startTotalMinutes < lunchEnd && endTotalMinutes > lunchStart;
        }
    };

    const apiService = {
        async getReservations(url) {
            if (!url) return [];
            const urlWithCacheBust = `${url}?v=${new Date().getTime()}`;
            const response = await fetch(urlWithCacheBust);
            if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
            return await response.json();
        },

        async addReservation(url, reservationData) {
            if (!url) throw new Error("API URL 未設定");
            const payload = { action: "addReservation", ...reservationData };
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            return await response.json();
        },

        async deleteReservation(url, reservationId) {
            if (!url) throw new Error("API URL 未設定");
            const payload = { action: "deleteReservation", id: reservationId };
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            return await response.json();
        }
    };

    App.init();
});
