var FIX = {},
    listBaseDepartment = [],
    customForm = document.getElementById('ifrmCustomForm').contentWindow;

var vm = new Vue({
    el: '#vm',
    data: {
        FIX, // เก็บค่า fix
        listFixCustomTemplateGroup: [],
        listBaseCustomTemplate: [],
        listBaseDepartment: [],
        baseCustomTemplate: {},
        classInActive: 'fa fa-eye-slash fa-2x',
        isHaveDepartmentTemplate: false,
        listSelectDepartment: [],
    },
    beforeCreate: async function () {
        await init();
        this.FIX = FIX;
        this.listFixCustomTemplateGroup = listFixCustomTemplateGroup;
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
                console.log('update list');
            }
        },
        readEditTemplate: function (el) {
            this.baseCustomTemplate = Object.assign({}, el);

            if (this.baseCustomTemplate.listBaseCustomTemplateDepartment.length) {
                let listBaseDepartment = this.baseCustomTemplate.listBaseCustomTemplateDepartment;
                let result = listBaseDepartment.map(el => el.baseDepartmentId);
                $('#ddl_selectDepartment').val(result);
                $('#ddl_selectDepartment').trigger('change');
            }

            this.changeTemplateGroup();
            this.setClassInActive();
        },
        changeTemplateGroup: function () {
            let template = this.listFixCustomTemplateGroup.find(el => el.objectID === this.baseCustomTemplate.fixCustomTemplateGroup);
            this.isHaveDepartmentTemplate = template.is_department_template === FIX.FixBooleanStatus.TRUE;
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
            this.baseCustomTemplate = { active: this.FIX.FixBooleanStatus.TRUE };
            this.setClassInActive();
        },
        saveTemplate: async function () {
            if (!this.baseCustomTemplate) {
                alert('กรุณากรอกชื่อ Template');
                return;
            }

            // ถ้า template นี้เลือก department ได้
            if (this.isHaveDepartmentTemplate) {
                let listDepartment = $('#ddl_selectDepartment').val(),
                    _temp = [],
                    listBaseCustomTemplateDepartment = this.baseCustomTemplate.listBaseCustomTemplateDepartment;

                listDepartment.forEach(departmentID => {
                    let oldData;
                    if (listBaseCustomTemplateDepartment)
                        oldData = listBaseCustomTemplateDepartment.filter(templateDepartment => templateDepartment.baseDepartmentId === departmentID);

                    if (oldData) {
                        _temp.push(oldData);
                    } else {
                        _temp.push({ baseDepartmentId: departmentID });
                    }
                });

                this.baseCustomTemplate.listBaseCustomTemplateDepartment = [..._temp];
            }

            let param = JSON.stringify(this.baseCustomTemplate);

            if ("objectID" in this.baseCustomTemplate) {
                await useFetch({
                    url: `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}`,
                    method: 'PUT',
                    body: param
                });
            } else {
                await useFetch({
                    url: '/imed/ws/setups/custom_forms',
                    body: param,
                    method: 'POST'
                });
            }

            this.fillterListTemplate();
        },
        deleteTemplate: async function () {
            if ("objectID" in this.baseCustomTemplate) {
                if (confirm('ยืนยันที่จะลบ Template?')) {
                    debugger;
                    await useFetch({
                        url: `/imed/ws/setups/custom_forms/${this.baseCustomTemplate.objectID}`,
                        body: JSON.stringify(this.baseCustomTemplate),
                        method: 'DELETE'
                    });

                    $('#ddl_selectDepartment').val(null).trigger('change');
                    this.craeteNewTemplate();
                    this.fillterListTemplate();
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
    if (method.toUpperCase() === "GET") {
        let response;
        try {
            response =  await fetch(url);
        } catch(err) {
            console.error(err);
        }

        return await response.json();
    } else {
        await fetch(url, {
            headers: { "Content-Type": "application/json;"},
            method,
            body,
        }).then(res => {
            if(res.ok)
                console.log('fetch complete!');
        }).catch(err => console.error(err));
    }
}