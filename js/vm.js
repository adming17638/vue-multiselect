var FIX = {},
    listBaseDepartment = [];

Vue.component('vue-multiselect', window.VueMultiselect.default)

var vm = new Vue({
    el: '#vm',
    data: {
        FIX, // เก็บค่า fix
        listFixCustomTemplateGroup: [],
        listBaseCustomTemplate: [],
        selectDepartment: [],
        listBaseDepartment: [],
        baseCustomTemplate: {},
        classInActive: 'fa fa-eye-slash fa-2x',
        isHaveDepartmentTemplate: false,
        show: true,
    },
    beforeCreate: async function () {
        await init();
        this.FIX = FIX;
        let _listFixCustomTemplateGroup = await useFetch({ url: '/imed/ws/masterdatas/bases/customtemplate' });
        this.listFixCustomTemplateGroup = _listFixCustomTemplateGroup.RESULT_DATA;
        let _listBaseDepartment = await useFetch({ url: '/imed/ws/masterdatas/bases/department'});
        this.listBaseDepartment = _listBaseDepartment.RESULT_DATA;
    },
    computed: {
        checkHaveDepartment: function () {
            return this.isHaveDepartmentTemplate;
        },
        checkEmpty: function() {
            return !Object.keys(this.baseCustomTemplate).length;
        }
    },
    methods: {
        fillterListTemplate: async function () {
            let keyword = document.getElementById('ddl_typeLeft').value;
            if (keyword) {
                let result = await useFetch({ url: `/imed/ws/setups/custom_forms?custom_template_group=${keyword}`});
                this.listBaseCustomTemplate = result.slice(0);
            }
        },
        readEditTemplate: function (el) {
            this.$refs.notification.work();
            this.baseCustomTemplate = Object.assign({}, el);

            // ถ้า template มี listBaseDepartment จะต้องนำค่าไปเพิ่มใน ComboBox ก่อน
            if (this.baseCustomTemplate.listBaseCustomTemplateDepartment && this.baseCustomTemplate.listBaseCustomTemplateDepartment.length) {
                let listTemplateDepartment = this.baseCustomTemplate.listBaseCustomTemplateDepartment;
                let _temp = listTemplateDepartment.map(templateDepartment => {
                    let result = this.listBaseDepartment.find(baseDepartment => baseDepartment.objectID === templateDepartment.baseDepartmentId);
                    result.baseCustomTemplateId = templateDepartment.baseCustomTemplateId;
                    result.templateDepartmentID = templateDepartment.objectID;
                    return result;
                });

                this.selectDepartment = _temp.slice(0);
            } else {
                this.selectDepartment = [];
            }
            let customForm = document.getElementById('ifrmCustomForm').contentWindow;
            customForm.clear();
            customForm.importCustomForm(this.baseCustomTemplate.listBaseCustomForm);

            this.changeTemplateGroup();
            this.setClassInActive();
            this.$refs.notification.clear();
        },
        changeTemplateGroup: function () {
            let template = this.listFixCustomTemplateGroup.find(el => el.objectID === this.baseCustomTemplate.fixCustomTemplateGroup);
            this.isHaveDepartmentTemplate = template.isDepartmentTemplate === FIX.FixBooleanStatus.TRUE;
        },
        toggleInActive: function () {
            let url, status;
            if (this.baseCustomTemplate.active === this.FIX.FixBooleanStatus.TRUE) {
                url = `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}/inactive`;
                status = this.FIX.FixBooleanStatus.FALSE;
            } else {
                url = `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}/active`;
                status = this.FIX.FixBooleanStatus.TRUE;
            }

            useFetch({ url, method: 'PUT', body: JSON.stringify(this.baseCustomTemplate)});

            this.baseCustomTemplate.active = status;
            this.setClassInActive();
        },
        setClassInActive: function () {
            this.classInActive = this.baseCustomTemplate.active === this.FIX.FixBooleanStatus.TRUE
                ? "fa fa-eye fa-2x"
                : "fa fa-eye-slash fa-2x";
        },
        craeteNewTemplate: function () {
            this.baseCustomTemplate = {
                active: this.FIX.FixBooleanStatus.TRUE,
            };
            document.getElementById('ifrmCustomForm').contentWindow.clear();
            this.setClassInActive();
        },
        saveTemplate: async function () {
            if (!this.baseCustomTemplate.description) {
                this.$refs.notification.trigger({ type: 'warning', message: 'กรุณากรอกชื่อ Template' });
                return;
            }

            // ถ้า template นี้เลือก department ได้
            if (this.isHaveDepartmentTemplate) {
                let _temp = [];

                this.selectDepartment.forEach(el => {
                    if ("templateDepartmentID" in el) {
                        _temp.push({
                            objectID: el.templateDepartmentID,
                            baseCustomTemplateId: el.baseCustomTemplateId,
                            baseDepartmentId: el.objectID
                        });
                    } else {
                        _temp.push({ baseDepartmentId: el.objectID });
                    }
                });

                this.baseCustomTemplate.listBaseCustomTemplateDepartment = [..._temp];
            }

            // ดึงข้อมูลจาก custom form
            let customForm = document.getElementById('ifrmCustomForm').contentWindow;
            this.baseCustomTemplate.listBaseCustomForm = customForm.exportCustomForm();

            let clone = Object.assign({}, this.baseCustomTemplate),
                responseResult;

            if ("objectID" in this.baseCustomTemplate) {
                /** UPDATE */
                responseResult = await useFetch({
                    url: `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}`,
                    method: 'PUT',
                    body: clone
                });
            } else {
                /** INSERT */
                responseResult = await useFetch({
                    url: '/imed/ws/setups/custom_forms',
                    method: 'POST',
                    body: clone
                });

                responseResult = await useFetch({url: `/imed/ws/setups/custom_forms/${responseResult.objectID}`});
            }

            this.fillterListTemplate();
            this.readEditTemplate(responseResult);
            this.$refs.notification.success();
        },
        deleteTemplate: async function () {
            if ("objectID" in this.baseCustomTemplate) {
                if (confirm('ยืนยันที่จะลบ Template?')) {
                    await useFetch({
                        url: `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}`,
                        body: JSON.stringify(this.baseCustomTemplate),
                        method: 'DELETE'
                    });

                    this.craeteNewTemplate();
                    this.fillterListTemplate();
                    this.selectDepartment = [];
                    document.getElementById('ifrmCustomForm').contentWindow.clear();
                }
            }
        },
    },
});

// โหลดค่า FIX
async function init() {
    const registeredFixes = ["FixBooleanStatus", "FixCustomTemplateType", "FixCustomTemplateGroup"];
    var fixValueStorage = {};
    registeredFixes.forEach(async (fixValueName) => {
        const fixNameKey = `${fixValueName}`;
        let fixValues = fixValueStorage[fixNameKey];
        if (!fixValues) {
            const baseUrl = `/imed/ws/masterdatas/fixs/${fixValueName}`;
            try {
                let fixValuesFetchResponse = await fetch(baseUrl);
                fixValues = await fixValuesFetchResponse.json()
                fixValues = fixValues.RESULT_DATA;
                fixValues = fixValues.reduce((fixObj, fixValue) => {
                    fixObj[fixValue.name] = fixValue.id;
                    return fixObj;
                }, {});
                fixValueStorage[fixNameKey] = fixValues;
            } catch (e) {
                console.error(`Cannot fetch data from URL = ${baseUrl}, ${e.message}`);
            }
        }
    });
    FIX = fixValueStorage;
};

async function useFetch({ url, method = 'GET', body = ''}) {
    try {
        let response;

        if (!!body) {
            body = ((typeof body).toLowerCase() === String.name.toLowerCase())
                ? body
                : JSON.stringify(body);
        }

        switch (method.toUpperCase()) {
            case "GET":
                response =  await fetch(url);
                return await response.json();
            case "POST":
            case "PUT":
                response = await fetch(url, {
                    headers: { "Content-Type": "application/json;"},
                    method,
                    body,
                });
                return await response.json();
            case "DELETE":
                await fetch(url, {
                    headers: { "Content-Type": "application/json;"},
                    method,
                    body,
                });
                break;
            default:
                break;
        }
    } catch(err) {
        vm.$refs.notification.error();
        console.error(err);
    }
}