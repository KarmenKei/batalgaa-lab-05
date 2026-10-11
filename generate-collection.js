const fs = require('fs');

const cases = [
  { id: 'TC01', name: 'Active student registers successfully', student: 'STU_TC01', status: 'active', taken: ['CS201'], course: 'COURSE_TC01', prereq: ['CS201'], postStudent: 'STU_TC01', postCourse: 'COURSE_TC01', code: 201, result: 'OK', extra: 'registrationID' },
  { id: 'TC02', name: 'Missing student returns ERROR_NO_STUDENT', student: 'STU_OTHER_TC02', status: 'active', taken: [], course: 'COURSE_TC02', prereq: [], postStudent: 'STU_MISSING_TC02', postCourse: 'COURSE_TC02', code: 200, result: 'ERROR_NO_STUDENT' },
  { id: 'TC03', name: 'Inactive student returns ERROR_INACTIVE_STUDENT', student: 'STU_TC03', status: 'inactive', taken: [], course: 'COURSE_TC03', prereq: [], postStudent: 'STU_TC03', postCourse: 'COURSE_TC03', code: 200, result: 'ERROR_INACTIVE_STUDENT' },
  { id: 'TC04', name: 'Missing course returns ERROR_NO_COURSE', student: 'STU_TC04', status: 'active', taken: [], course: 'COURSE_OTHER_TC04', prereq: [], postStudent: 'STU_TC04', postCourse: 'COURSE_MISSING_TC04', code: 200, result: 'ERROR_NO_COURSE' },
  { id: 'TC05', name: 'Missing prerequisite returns ERROR_PREREQUISITES', student: 'STU_TC05', status: 'active', taken: [], course: 'COURSE_TC05', prereq: ['CS201'], postStudent: 'STU_TC05', postCourse: 'COURSE_TC05', code: 200, result: 'ERROR_PREREQUISITES', extra: 'missing' },
  { id: 'TC06', name: 'Missing studentID returns ERROR_BAD_REQUEST', student: 'STU_TC06', status: 'active', taken: [], course: 'COURSE_TC06', prereq: [], postStudent: null, postCourse: 'COURSE_TC06', code: 400, result: 'ERROR_BAD_REQUEST' },
  { id: 'TC07', name: 'Missing courseID returns ERROR_BAD_REQUEST', student: 'STU_TC07', status: 'active', taken: [], course: 'COURSE_TC07', prereq: [], postStudent: 'STU_TC07', postCourse: null, code: 400, result: 'ERROR_BAD_REQUEST' },
  { id: 'TC08', name: 'Course without prerequisites accepts student', student: 'STU_TC08', status: 'active', taken: [], course: 'COURSE_TC08', prereq: [], postStudent: 'STU_TC08', postCourse: 'COURSE_TC08', code: 201, result: 'OK', extra: 'registrationID' },
  { id: 'TC09', name: 'Empty coursesTaken fails required prerequisite', student: 'STU_TC09', status: 'active', taken: [], course: 'COURSE_TC09', prereq: ['CS201'], postStudent: 'STU_TC09', postCourse: 'COURSE_TC09', code: 200, result: 'ERROR_PREREQUISITES', extra: 'missing' },
  { id: 'TC10', name: 'Inactive student takes precedence over missing course', student: 'STU_TC10', status: 'inactive', taken: [], course: 'COURSE_TC10', prereq: [], postStudent: 'STU_TC10', postCourse: 'COURSE_MISSING_TC10', code: 200, result: 'ERROR_INACTIVE_STUDENT' },
  { id: 'TC11', name: 'Malformed JSON returns ERROR_BAD_JSON', student: 'STU_TC11', status: 'active', taken: [], course: 'COURSE_TC11', prereq: [], malformed: true, code: 400, result: 'ERROR_BAD_JSON' }
];

function request(name, method, path, body, testScript) {
  const item = {
    name,
    request: {
      method,
      header: body === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
      url: { raw: '{{baseUrl}}' + path, host: ['{{baseUrl}}'], path: path.split('/').filter(Boolean) }
    },
    response: []
  };
  if (body !== undefined) {
    item.request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  }
  if (testScript) item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: testScript.split('\n') } }];
  return item;
}

const folders = cases.map(t => {
  const items = [];
  if (t.id !== 'TC11') {
    const studentSetup = { status: t.status, coursesTaken: t.taken };
    items.push(request('Setup student', 'PUT', '/students/' + t.student, studentSetup));
    items.push(request('Setup course', 'PUT', '/courses/' + t.course, { prerequisites: t.prereq }));
  } else {
    items.push(request('Setup student', 'PUT', '/students/' + t.student, { status: t.status, coursesTaken: t.taken }));
    items.push(request('Setup course', 'PUT', '/courses/' + t.course, { prerequisites: t.prereq }));
  }

  let body;
  if (t.malformed) {
    body = '{"studentID":';
  } else {
    body = {};
    if (t.postStudent !== null) body.studentID = t.postStudent;
    if (t.postCourse !== null) body.courseID = t.postCourse;
  }

  const tests = [
    `pm.test("HTTP status is ${t.code}", function () { pm.response.to.have.status(${t.code}); });`,
    `pm.test("result is ${t.result}", function () { pm.expect(pm.response.json().result).to.eql("${t.result}"); });`
  ];
  if (t.extra === 'registrationID') {
    tests.push('pm.test("registrationID is a number", function () { pm.expect(pm.response.json().registrationID).to.be.a("number"); });');
  }
  if (t.extra === 'missing') {
    tests.push('pm.test("missing includes CS201", function () { pm.expect(pm.response.json().missing).to.include("CS201"); });');
  }

  items.push(request(
    t.name,
    'POST',
    '/registrations',
    body,
    tests.join('\n')
  ));

  return { name: t.id + ' - ' + t.name, item: items };
});

const collection = {
  info: {
    name: 'Lab 05 - Course Registration API',
    description: 'Independent registration tests designed using equivalence classes, representative values, specifications, and executable test cases.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: folders.map(f => ({ name: f.name, item: f.item })),
  variable: [{ key: 'baseUrl', value: 'http://localhost:3000', type: 'string' }]
};

fs.writeFileSync('lab05-collection.json', JSON.stringify(collection, null, 2) + '\n');
console.log(`Generated collection with ${cases.length} independent test folders.`);
