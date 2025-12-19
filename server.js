const express = require('express');
const axios = require('axios'); // confirm  this
const cookieParser = require('cookie-parser'); // confirm this 
const cors = require('cors');
require('dotenv').config(); // 

const app = express();
const PORT = process.env.PORT || 5000;

const URL_CART_SERVICE = process.env.URL_CART_SERVICE || 'http://localhost:8082'; //
const URL_CATALOG_SERVICE = process.env.URL_CATALOG_SERVICE || 'http://localhost:8080'; //
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8081'; // this was the issue
const URL_ORDER_SERVICE = process.env.URL_ORDER_SERVICE || 'http://localhost:8083'; //
const URL_PAYMENT_SERVICE = process.env.URL_PAYMENT_SERVICE || 'http://localhost:8084';


// middleware
app.use(cors({
  origin: 'http://localhost:3000', // react url
  credentials: true // for cookies

}));

app.use(express.json()); //

app.use(cookieParser()); //

// logging the middleware
app.use((req, res, next) => { // 

  next();

});

// health check
app.get('/api/health', (req, res) => {

  res.json({

    status: 'OK',
    message: 'The BFF layer is running correctly!',
    timestamp: new Date().toISOString()
  });

});

// Authentication Endpoints

// registeration
app.post('/api/auth/register', async(req, res) => {

  try {
    const {
      email, 
      password, 
      firstName,
      lastName,
      phone,
      address,
      payment
    } = req.body;

    if (!password || !firstName || !lastName || !email )  {

      return res.status(400).json ({

        message: 'The email, password, first name and last name are necessary!'

      });
    }

    if  ( password.length < 6 )  {

      return res.status(400).json ({
        
        message: 'The password has to be atleast 6 characters long!'

      });
    }

    // here we format the data for the user service (springboot)
    // Map frontend format to backend expected format
    
    // Format shipping address as a string if provided
    let shippingAddress = '';
    if (address && typeof address === 'object') {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.zip) parts.push(address.zip);
      shippingAddress = parts.join(', ') || 'Not provided';
    } else {
      shippingAddress = 'Not provided';
    }

    const userInformation = {
      name: `${firstName} ${lastName}`,
      email: email,
      password: password,
      phoneNumber: phone || 'Not provided',
      shippingAddress: shippingAddress,
      creditCardNumber: (payment && payment.cardNumber) ? payment.cardNumber : 'Not provided'
    };

    
    // here we call user service (springboot) 

    const response = await   axios.post (
      
      `${URL_USER_SERVICE}/api/auth/register`,
      userInformation, 
      {

        withCredentials: true, // 
        validateStatus:  (status) =>  status  < 500 //
      }
    );


    const cookieHeaderSet = response.headers[ 'set-cookie'  ];

    if (   cookieHeaderSet )  {

      res.setHeader('Set-Cookie', cookieHeaderSet); // 


    }

    if ( response.status   === 409) {

      return res.status(409).json ({
        
        message: 'This email is already in use by another user!'
      });

    } else if (  response.status   === 201) {

      return res.status(201).json({

        message:  'Registeration was successful!',

        user: response.data
      });

    } else  {

      return res.status(response.status).json(response.data);

    }

  } catch (  x ) {

    if (  x.response  )  {
      return res.status(x.response.status).json({

        message:  x.response.data.message || 'Registeration was not successful!'
      });

    }

    res.status(500).json ({

      message:   'There was a server error during the registerstion', 
      error:  x.message
    });


  }

  });

  // for login

  app.post ('/api/auth/login',  async  (req, res)  => {


    try {

      const  {email, password}  = req.body;


      if (!password ||   !email )  {

        return res.status(400).json({

          message:  'The email and password are required'

        }); 
     }


     const response = await   axios.post (
      
      `${URL_USER_SERVICE}/api/auth/login`,
      {email, password}, 
      {

        withCredentials: true, // 
        validateStatus:  (status) =>  status  < 500 //
      }
    );


    // 
    const cookieHeaderSet = response.headers[ 'set-cookie'  ];

    if (   cookieHeaderSet )  {

      res.setHeader('Set-Cookie', cookieHeaderSet); // 


    }

    if ( response.status   === 401) {

      return res.status(401).json ({
        
        message: 'The email or password was wrong!',

        

      });

    } else if (  response.status   === 200) {

      return res.status(200).json({

        message: 'This Login was successful!',

        user: response.data.user

      });

    } else  {

      return res.status(response.status).json(response.data);

    }

  } catch (  x ) {

    if (  x.response  )  {
      return res.status(x.response.status).json({

        message:  x.response.data.message || 'The login failed!'
      });

    }

    res.status(500).json ({

      message:   'There was a server error during the login', 
      error:  x.message
    });



    }
  });


  // this is the me in-order to get teh current loggin-in user info

  app.get ('/api/auth/me',  async  (req, res)  => {


    try {

     const response = await   axios.get (
      
      `${URL_USER_SERVICE}/api/auth/me`, 
      {
        headers: {
          Cookie: req.headers.cookie || ''
        },

        withCredentials: true, // 
        validateStatus:  (status) =>  status  < 500 //
      }
    );


    if ( response.status   === 401) {

      return res.status(401).json ({
        
        authenticated: false,
        message: 'Not Authenticated',

        

      });

    } else if (  response.status   === 200) {

      return res.status(200).json(

       response.data

      );

    } 

      return res.status(response.status).json(response.data);

    

  } catch (  x ) {

    if (  x.response  )  {
      return res.status(x.response.status).json({

        authenticated: false,
        message:  'The authentication failed!'
      });

    }

    res.status(500).json ({

      authenticated:  false,
      message:   'There was a server error!', 
      
    });



    }
  });


  // the logout

  app.post ('/api/auth/logout',  async  (req, res)  => {


    try {


     const response = await   axios.post (
      
      `${URL_USER_SERVICE}/api/auth/logout`,
      {}, 
      {

        headers: {
          
          Cookie: req.headers.cookie    ||   ''
        },

        withCredentials: true, // 
        validateStatus:  (status) =>  status  < 500 //
      }
    );


    // 
    const cookieHeaderSet = response.headers[ 'set-cookie'  ];

    if (   cookieHeaderSet )  {

      res.setHeader('Set-Cookie', cookieHeaderSet); // 


    }

    return  res.json({
      
      message:  'The logout was successful!', 

      logged_out: true  // double check this


    });



  } catch (  x ) {

    res.status(500).json( {

      message:   'There was a server error during the logout process!'
    });
  }



  });

  // the following is for updating the user profile


  app.put ('/api/auth/profile',  async  (req, res)  => {


    try {



     const response = await   axios.put (
      
      `${URL_USER_SERVICE}/api/auth/profile`,
      req.body, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
        validateStatus:  (status) =>  status  < 500 //
      }
    );


    

    if ( response.status   === 401) {

      return res.status(401).json ({
        
        message: 'This is not authenticated!',

        

      });

    } else if (  response.status   === 200) {

      return res.status(200).json({

        message: 'The profile was updated successfully!!',

        user: response.data.user

      });

    } 

      return res.status(response.status).json(response.data);  //

    

  } catch (  x ) {

    if (  x.response  )  {
      return res.status(x.response.status).json(
        response.data
      );

    }

    res.status(500).json ({

      message:   'There was a server error during the profile update', 
      error:  x.message
    });



    }
  });



  // new
  // this is to get the products

  app.get ('/api/cart',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_CART_SERVICE}/api/cart`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    if (  x.response?.status ===  401 )  {

      return res.status(401).json({message:  "This is not authenticated!"});

    }

    res.status(500).json ({

      message:   'There was a error during fetchign the cart!'
      
    });



    }
  });


  // this is to post the products

  app.post ('/api/cart/items',  async  (req, res)  => {


    try {



     const response = await   axios.post (
      
      `${URL_CART_SERVICE}/api/cart/items`,
      req.body, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    if (  x.response?.status  ===  401 )  {

      return res.status(401).json({message:  "This is not authenticated!"});

    }

    res.status(x.response?.status  ||  500).json ({

      message:  x.response?.data?.message || 'There was a error while adding the item to the cart!'  // this is special 
      
    });



    }
  });


  // this is for updating the cart item (put)
  app.put ('/api/cart/items/:productId',  async  (req, res)  => {


    try {



     const response = await   axios.put (
      
      `${URL_CART_SERVICE}/api/cart/items/${req.params.productId}`,
      req.body, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while updating the item!'  // this is special 
      
    });



    }
  });

  // this is for deleting the cart item

  app.delete ('/api/cart/items/:productId',  async  (req, res)  => {


    try {



     const response = await   axios.delete (
      
      `${URL_CART_SERVICE}/api/cart/items/${req.params.productId}`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while deleting the item from the cart!'  // this is special 
      
    });



    }
  });


  // deleting the entire cart
  app.delete ('/api/cart',  async  (req, res)  => {


    try {



     const response = await   axios.delete (
      
      `${URL_CART_SERVICE}/api/cart`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while deleting the entire cart!'  // this is special 
      
    });



    }
  });
  

  // new 
  // these are the order 

  // this is the post

  app.post ('/api/orders/checkout',  async  (req, res)  => {


    try {



     const response = await   axios.post (
      
      `${URL_ORDER_SERVICE}/api/orders/checkout`,
      req.body,
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:  x.response?.data?.message || 'There was an error in proccessing checkout'  // this is special 
      
    });



    }
  });

  // this gets the users order history
  app.get ('/api/orders',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_ORDER_SERVICE}/api/orders`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while fetching the orders!'  // this is special 
      
    });



    }
  });

  // this gets the specific order
  app.get ('/api/orders/:orderId',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_ORDER_SERVICE}/api/orders/${req.params.orderId}`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    if (x.response?.status  ===  404) {

      return res.status(404).json({message: 'The order was not found!'});
    }

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while fetching the orders!'  // this is special 
      
    });



    }
  });


  // new
  // admin stuf

  // gets all the users for the admin
  app.get ('/api/admin/users',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_USER_SERVICE}/api/admin/users`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    
    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while fetching the users!',  // this is special 
     
      
    });



    }
  });


  // get all the orders for the admin
  app.get ('/api/admin/orders',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_ORDER_SERVICE}/api/admin/orders`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while fetching the orders!'  // this is special 
      
    });



    }
  });

  // this creates a new product - admin
  app.post ('/api/admin/products',  async  (req, res)  => {


    try {



     const response = await   axios.post (
      
      `${URL_CATALOG_SERVICE}/api/admin/products`, 
      req.body,
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
    res.status(201).json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while creating the product!'  // this is special 
      
    });



    }
  });

  // update the product - admin
  app.put ('/api/admin/products/:id',  async  (req, res)  => {


    try {



     const response = await   axios.put (
      
      `${URL_CATALOG_SERVICE}/api/admin/products/${req.params.id}`, 
      req.body,
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while updating the product!'  // this is special 
      
    });



    }
  });


  // deleting the product - admin
  app.delete ('/api/admin/products/:id',  async  (req, res)  => {


    try {



     const response = await   axios.delete (
      
      `${URL_CATALOG_SERVICE}/api/admin/products/${req.params.id}`, 
      {
        headers:  {

          Cookie: req.headers.cookie   ||  ''

        },

        withCredentials: true, // 
      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(x.response?.status  ||  500).json ({

      message:   'There was a error while deleting the product!'  // this is special 
      
    });



    }
  });


  // new 
  // this is to get all the products

  app.get ('/api/products',  async  (req, res)  => {


    try {

      const {category, brand, search, sortBy, sortOrder, page, limit} =  req.query;



     const response = await   axios.get (
      
      `${URL_CATALOG_SERVICE}/api/products`, 
      {
       
        params: {category, brand, search, sortBy, sortOrder, page, limit}

      }
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

    

    res.status(500).json ({

      message:   'There was a error while fetching the products!', // this is special 
      error: x.message
      
    });



    }
  });


  // to get the product by id
  app.get ('/api/products/:id',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_CATALOG_SERVICE}/api/products/${req.params.id}`
    );




    
 res.json(response.data);  //

    

  } catch (  x ) {

    if (x.response?.status  ===  404) {

      return res.status(404).json({message: 'The product was not found!'});
    }

    

    res.status(500).json ({

      message:   'There was a error while fetching the products!'  // this is special 
      
    });



    }
  });


  // this is to get all the product categories
  app.get ('/api/categories',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_CATALOG_SERVICE}/api/categories`
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

   

    res.status(500).json ({

      message:   'There was a error while fetching the categories!'  // this is special 
      
    });



    }
  });

  // this is for getting all the brands
  app.get ('/api/brands',  async  (req, res)  => {


    try {



     const response = await   axios.get (
      
      `${URL_CATALOG_SERVICE}/api/brands`
    );


    
 res.json(response.data);  //

    

  } catch (  x ) {

   

    res.status(500).json ({

      message:   'There was a error while fetching the brands!'  // this is special 
      
    });



    }
  });


  // payment

  app.post('/api/payment/process', async (req, res)  => {

    try {

      const response  = await  axios.post  (

        `${URL_PAYMENT_SERVICE}/api/payment/process`,
        req.body,
        {
          headers:  {
            Cookie:  req.headers.cookie  ||  ''
          },

          withCredentials:  true,

          validateStatus:  (status)  =>  status  < 500
        }
      );

      return res.status(response.status).json(response.data);

    }  catch (x)  {

      if ( x.response  )  {

        return  res.status(x.response.status).json({

          message: x.response.data.message  ||  'The payment processing failed!'
        });
      }


      res.status(500).json({

        message: 'There was a server error which occured when processing!',

        error:  x.message

      });

    }
  });


  app.post('/api/payment/reset', async (req, res) =>  {

    try {

      const response =  await  axios.post (
        `${URL_PAYMENT_SERVICE}/api/payment/reset`,
        {},
        {
          headers: {
            Cookie: req.headers.cookie || ''
          },

          withCredentials:  true
        }
      );

      res.json(response.data);

    
    } catch  (x)  {

      res.status(x.response?.status  ||  500 ).json({

        message: 'There was error while resetting the payment counter!'
      });
    }
  });






  // the following is error handling

  // global error handler
  app.use((x, req, res, next)  => {

    res.status(500).json({

      message:  'There is an internal server error!',

      error:  process.env.NODE_ENV ===  'development'  ? x.message : undefined
    })

  });


  // this is the 404 handling
  app.use((req, res)  => {

    res.status(404).json({

      message:  'The endpoint was not found!',

      path:  req.path
    })

  });


  app.listen(PORT, () => {

    console.log(`The BFF server is running on http://localhost:${PORT}`)
  })


  
  












