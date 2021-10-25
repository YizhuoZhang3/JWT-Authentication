const Sequelize = require('sequelize');
//use jwt to make secret that allow one user and one password. //Lucy can't just change her ID to Moe's and log in with Moe's page
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const { STRING } = Sequelize;
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

User.prototype.generateToken = async function(){
  try{
    const token = await jwt.sign({id: this.id}, process.env.JWT);
    return {token}
  }catch(error){
    return(error)
  }
}

User.byToken = async(token)=> {
  try {
    const payload = await jwt.verify(token, process.env.JWT)
    console.log(payload)
    if(payload){
      const user = await User.findByPk(payload.id);
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
  const user = await User.findOne({
    where: {
      username,
      password
    }
  });
  const correct = await bcrypt.compare(password, user.password)
  if(correct){
    return(user)
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );
  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User
  }
};