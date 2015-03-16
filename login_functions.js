/*FUNCTION: validateUser
This validates the information for a new user or an existing user.
If a new user, displays error message if the account already exists 
or the input was faulty (blank fields). Otherwise upon new account 
creation redirects to main page. If user exists, displays error
message if the login was unsuccessful, or redirects to the main page. 
*/
function validateUser(_name, _password, _response, _type) {
     	
	var responseNode = document.getElementById(_response);
	var name = document.getElementById(_name).value;
	var password = document.getElementById(_password).value;
	var response; 
	
	//Validate entries 
	if (name.length === 0) {
		responseNode.innerHTML = 'You must enter a user name!';
	}
	
	else if (password.length === 0) {
		responseNode.innerHTML = 'You must choose a password!';
	}
	
	else {	
		var req = new XMLHttpRequest();
		var info; 
		
		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
				
		info = 'type=' + _type;
		info += '&user=' + name;	
		info += '&password=' + password;
		
		req.open('POST', 'main.php', true);
		req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		//Print out results and dynamically update tables 		
		req.onreadystatechange = function() {	
			if (this.readyState == 4) {
			
				response = req.responseXML.getElementsByTagName("response_text")[0].innerHTML; 
				
				if (response === 'success') {
					window.location="MainPage.html";
				}
				
				else {
					responseNode.innerHTML = response;
				}
			}
		};
	}
	
	 //Send the request	
	req.send(info);	
}

