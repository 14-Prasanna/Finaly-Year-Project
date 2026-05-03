import requests
s = requests.Session()
r1 = s.post('http://127.0.0.1:5000/register', json={'username': 'autotest4', 'password': 'autotest123'})
print("Register:", r1.status_code, r1.text)

r2 = s.post('http://127.0.0.1:5000/login', json={'username': 'autotest4', 'password': 'autotest123'})
print("Login:", r2.status_code, r2.text)
print("Cookies:", r2.cookies.get_dict())

r3 = s.post('http://127.0.0.1:5000/predict', json={'test': 1})
print("Predict:", r3.status_code, r3.text)
