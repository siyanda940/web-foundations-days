Library Books REST API
Overview

This API manages books in a library.

Base URL: /api/books

Each book contains an ID, title, author, publication year and ISBN.

1. List All Books
   Method: GET
   Path: /api/books
   Description: Returns a list of all books in the library.
   Request body: Not required.
   Success status: 200 OK
2. Get One Book
   Method: GET
   Path: /api/books/{id}
   Description: Returns the details of a book using its ID.
   Request body: Not required.
   Success status: 200 OK
3. Create a Book
   Method: POST
   Path: /api/books
   Description: Creates a new book in the library.
   Example request body:
   {
   "title": "Things Fall Apart",
   "author": "Chinua Achebe",
   "publicationYear": 1958,
   "isbn": "9780385474542"
   }

Success status: 201 Created 4. Update a Book
Method: PUT
Path: /api/books/{id}
Description: Updates an existing book using its ID.
Example request body:
{
"title": "Things Fall Apart",
"author": "Chinua Achebe",
"publicationYear": 1958,
"isbn": "9780385474542"
}

Success status: 200 OK 5. Delete a Book
Method: DELETE
Path: /api/books/{id}
Description: Deletes a book using its ID.
Request body: Not required.
Success status: 204 No Content 6. List Books by Author
Method: GET
Path: /api/books?author=Chinua%20Achebe
Description: Returns books written by the author specified in the query parameter.
Request body: Not required.
Success status: 200 OK
Error Responses
400 Bad Request
Description: The request contains invalid data.
Example: A request attempts to create a book without a required title.
404 Not Found
Description: The requested resource does not exist.
Example: A request to GET /api/books/999 asks for a book that cannot be found.
