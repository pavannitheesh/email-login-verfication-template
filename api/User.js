const bcrypt=require("bcrypt");
const express = require("express");
const router=express.Router();
const User = require("../models/User");
const UserVerification =require("../models/UserVerification");
require("dotenv").config();
const nodemailer=require("nodemailer");

const { v4: uuidv4 } = require('uuid');

const path=require("path");


let transporter=nodemailer.createTransport({
        service :"gmail",
        auth :{
            user : process.env.AUTH_EMAIL,
            pass: process.env.AUTH_PASS
        }

})    

const sendVerificationMail=({_id,email},res)=>{
    //current url
    const currentUrl=`http://localhost:${process.env.PORT}`;

    //unique string for identification of each user
    const uniqueString=uuidv4()+_id;
    var mailOptions = {
        from:process.env.AUTH_EMAIL,
        to: email,
        subject: 'Verify your Email',
       text: `${currentUrl+"/user/verify/"+_id+"/"+uniqueString}`
      };

    const saltRounds=10;
    bcrypt.hash(uniqueString, saltRounds).then((hashedUniqueString)=>{
        const newUserVerification=new UserVerification({
            userId:_id,
            uniqueString:hashedUniqueString,
            createdAt:Date.now(),
            expiresAt:Date.now()+3600000

        });
        newUserVerification.save()
        .then(()=>{
            transporter.sendMail(mailOptions)
            .then(()=>{
                res.json({
                    status: "PENDING",
                    message : "Verification Emial sent",
                   
                })
            })
            .catch(err=>{
                res.json({
                    status: "Failed",
                    message : "Verification Failed",
                    error:err.messages
                })
            })


        })
        .catch(err=>{
            res.json({
                status: "Failed",
                message : "Error occurred while saving the new User verified data",
                error:err.messages
            })

        });
    }
    )
    .catch(err=>{
        res.json({
            status: "Failed",
            message : "Error occurred while hasing the email data!!",
            error:err.message
        })

    })

}

  //sending the mail to the user
//   transporter.sendMail(mailOptions, function(error, info){
//     if (error) {
//       console.log(error);
//     } else {
//       console.log('Email sent: ' + info.response);
//     }
//   });


//ruute for verfy the mail
router.get("/verify/:userId/:uniqueString",(req,res)=>{
    let {uniqueString,userId}=req.params;
  
    
    
    UserVerification.findOne({userId})
    .then(resu=>{
        const hashedUniqueString=resu.uniqueString;
       
        if(resu){
          const {expiresAt}=resu;
          
          if(expiresAt.getTime()<Date.now()){
            //user does not exists
            UserVerification.deleteOne({userId})
            .then((result)=>{
                User.deleteOne({_id:userId})
                .then(()=>{
                    let msg="Link has been expired .please sign up agnain";
                    res.redirect(`/user/verified?error=true&message=${msg}`);

                })
                .catch(err=>{
                    let msg="clearing the user with exired unique string failed";
                    res.redirect(`/user/verified?error=true&message=${msg}`);
                });


            })
            .catch((err)=>{
                let msg="AN Error occurred while clearing the record of expired user";
                res.redirect(`/user/verified?error=true&message=${msg}`);
            })

          }else{
            //user exists
            bcrypt.compare(uniqueString,hashedUniqueString)
            .then((result)=>{
                if(result){
                    //String matches
                    User.updateOne({_id:userId},{verfied :true})
                    .then(()=>{
                       
                        UserVerification.deleteOne({uniqueString : hashedUniqueString})
                        .then(()=>{
                           
                            res.sendFile(path.join(__dirname,"./verified.html"));

                          
                        })
                        .catch(()=>{
                            let msg="AN Error occurred while finalizing the verified true";
                        res.redirect(`/user/verified?error=true&message=${msg}`);
                        })
                    })
                    .catch(()=>{
                        let msg="AN Error occurred while updating the record to verifred=true";
                        res.redirect(`/user/verified?error=true&message=${msg}`);
                    })
                   

                }
                else{
                    //existing record but incorrect verifivcation details passed 
                    let msg="Invalid Verification Details";
                    res.redirect(`/user/verified?error=true&message=${msg}`);



                }


            })
            .catch(()=>{
                let msg="an error ocurred while comparing the unique string";
                res.redirect(`/user/verified?error=true&message=${msg}`);


            });
            




          }


        }
        else{
            
            let msg="Account record does'nt exist or it has been already verifed.please sign in or log in";
            res.redirect(`/user/verified?error=true&message=${msg}`);


        }


    })
    .catch(()=>{
        let msg="AN Error occurred while checking for the existences of User";
        res.redirect(`/user/verified?error=true&message=${msg}`);


    })

})

//router for verifed email 
router.get("/verified",(req,res)=>{
    res.sendFile(path.join(__dirname,"./verified.html"));

});

//route for sign up
router.post("/signup",function(req,res){
    
    let {name,email,password,dateOfBirth}=req.body;
    name=name.trim();
    email=email.trim();
    password=password.trim();
    dateOfBirth=dateOfBirth.trim();
    if(name=="" || email=="" || password=="" || dateOfBirth=="")
    {
        res.json({
            status: "Failed",
            message : "Enter the details of your account"
        })


    }
    else if(!/^[a-zA-Z ]*$/.test(name)){
        res.json({
            status: "Failed",
            message : "Invalid name Entered"
        })
    }
    else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email))
    {
        res.json({
            status: "Failed",
            message : "Invalid Email entered"
        })
    }
    else if(!new Date(dateOfBirth).getTime())
    {
        res.json({
            status: "Failed",
            message : "Invalid Date"
        })
    }
    else if(password.length<6){
        res.json({
            status: "Failed",
            message : "Password must be at least 6 characters"
        })
    }
    else{
        User.find({email}).then(result=>{
            if(result.length){
                //user already exists
                res.json({
                    status: "Failed",
                    message : "User with provided email already exists"
                })


            }else{
                    //user does not exists
                    const saltRounds=10;
                    bcrypt.hash(password, saltRounds).then((hashedPassword) => {
                        const newUser=new User({
                            name,
                            email,
                            password : hashedPassword,
                            dateOfBirth,
                            verfied:false


                        });
                        newUser.save().then((resu) => {
                         sendVerificationMail(resu,res);


                        }).catch(err => {
                    res.json({
                    status: "Failed",
                    message : "Error ocured while saving the user data",
                    error: err.message
                    })

                        });



                    }).catch(err => {
                        
                        res.json({
                            status: "Failed",
                            message : "Error occured while hashing the password"
                        })
                    });





            }



        }).catch(err=>{
            console.log(err);
            res.json({
                status: "Failed",
                message : "an error occured while finding existing user"
            })


        });






    }




});
router.post("/signin",function(req,res){
    let {email,password}=req.body;
    email=email.trim();
    password=password.trim();
    if(email=="" || password==""){
        res.json({
            status: "Failed",
            message : "Empty Credititinals"
        })
    }else{
        User.find({email}).then((data)=>{
            console.log(data);
            const hashedPassword=data[0].password;
            if(data){
                console.log(data[0].verfied);
                if(!data[0].verfied){
                    res.json({
                        status: "Failed",
                        message : "User is not verified.check your Inbox for verification link",
                       
                    })

                }
                else{

                    bcrypt.compare(password, hashedPassword).then(()=>{
                        res.json({
                            status: "Success",
                            message : "Sigined in Succesfully",
                            data: data
                        })
    
                    })
                    .catch((err)=>{
                        res.json({
                            status: "Failed",
                            message : "error while comparing the password",
                            error:err.message
                        })
    
    
                    })
    
                }
                



            }else{ res.json({
                status: "Failed",
                message : "error ocuured while fetching the data"
            })



            }

        })
        .catch(err=>{
         res.json({
                status: "Failed",
                message : "Error ocurred while finding the user in signing in",
                error:err.message
            })


        })


    }

});

module.exports=router;