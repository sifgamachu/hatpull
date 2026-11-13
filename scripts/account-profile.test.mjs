import test from 'node:test';
import assert from 'node:assert/strict';
import { profileSymbol, updateProfileIcon, updateAccountEmail } from '../lib/account-profile.mjs';
test('profile pictures accept only the supported icons and retain an initial fallback', async () => {
  assert.equal(profileSymbol({email:'sam@example.com',user_metadata:{hatpull_avatar:'<img>'}}),'S');
  let request;
  const client={auth:{updateUser:async attributes => {request=attributes;return {data:{user:{email:'sam@example.com'}},error:null};}}};
  await assert.rejects(updateProfileIcon(client,'<img>'));
  assert.equal(request,undefined);
  await updateProfileIcon(client,'🎁');
  assert.deepEqual(request,{data:{hatpull_avatar:'🎁'}});
});
test('email changes validate the address, preserve the confirmation redirect and propagate auth errors', async () => {
  let request;
  const client={auth:{updateUser:async (...args) => {request=args;return {data:{user:{}},error:null};}}};
  await assert.rejects(updateAccountEmail(client,'bad','sam@example.com','https://hatpull.com/auth/callback'));
  await assert.rejects(updateAccountEmail(client,' SAM@example.com ','sam@example.com','https://hatpull.com/auth/callback'));
  assert.equal(request,undefined);
  await updateAccountEmail(client,' new@example.com ','sam@example.com','https://hatpull.com/auth/callback?next=%2Faccount');
  assert.deepEqual(request,[{email:'new@example.com'},{emailRedirectTo:'https://hatpull.com/auth/callback?next=%2Faccount'}]);
  const failure={auth:{updateUser:async()=>({data:{},error:new Error('Session expired')})}};
  await assert.rejects(updateAccountEmail(failure,'new@example.com','sam@example.com','https://hatpull.com/auth/callback'),/Session expired/);
});
